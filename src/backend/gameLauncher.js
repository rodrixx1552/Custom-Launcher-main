const fs = require('fs');
const path = require('path');
const os = require('os');
const axios = require('axios');
const AdmZip = require('adm-zip');
const { Client, Authenticator } = require("minecraft-launcher-core");

function init(ipcMain, app, context) {
    const launcher = new Client();
    const { discordManager, authManager, modManager } = context;
    const gameRoot = path.join(app.getPath('appData'), '.lospapus-minecraft');

    async function downloadFile(url, dest) {
        if (!fs.existsSync(path.dirname(dest))) fs.mkdirSync(path.dirname(dest), { recursive: true });
        try {
            const writer = fs.createWriteStream(dest);
            const response = await axios({ url, method: 'GET', responseType: 'stream', timeout: 120000 });
            response.data.pipe(writer);
            let received = 0;
            return await new Promise((resolve, reject) => {
                writer.on('finish', resolve);
                writer.on('error', reject);
                response.data.on('error', reject);
                response.data.on('data', chunk => {
                    received += chunk.length;
                    if (received > 512 * 1024 * 1024) response.data.destroy(new Error('La descarga excede el límite de 512 MB.'));
                });
            });
        } catch (err) {
            if (fs.existsSync(dest)) fs.unlinkSync(dest);
            throw err;
        }
    }

    ipcMain.on('launch-game', async (event, options) => {
        if (!options || typeof options !== 'object') {
            event.sender.send('launch-error', 'Opciones de inicio inválidas.');
            return;
        }
        let { nick, account } = options;
        const accountUuid = account?.uuid || options.accountUuid;
        if (typeof nick !== 'string' || !/^[A-Za-z0-9_]{3,16}$/.test(nick)) {
            event.sender.send('launch-error', 'El nombre de jugador debe tener entre 3 y 16 letras, números o guiones bajos.');
            return;
        }
        
        try {
            let auth;
            if (account?.uuid && account.type === 'microsoft') {
                console.log('Auth: Using Microsoft Session');
                const storedAccount = authManager.getAccountsLocal().find(a => a.uuid === account.uuid && a.type === 'microsoft');
                if (!storedAccount?.access_token) throw new Error('La sesión Microsoft ya no está disponible. Vuelve a iniciar sesión.');
                auth = {
                    access_token: storedAccount.access_token,
                    client_token: null,
                    uuid: storedAccount.uuid,
                    name: storedAccount.name,
                    user_properties: '{}'
                };
            } else if (accountUuid) {
                console.log('Auth: Searching for account in storage');
                const accounts = authManager.getAccountsLocal();
                const storedAccount = accounts.find(a => a.uuid === accountUuid);
                if (storedAccount) nick = storedAccount.name;
                if (storedAccount && storedAccount.type === 'microsoft') {
                    auth = {
                        access_token: storedAccount.access_token,
                        client_token: null,
                        uuid: storedAccount.uuid,
                        name: storedAccount.name,
                        user_properties: '{}'
                    };
                } else {
                    auth = await Authenticator.getAuth(nick);
                }
            } else {
                console.log('Auth: Using Offline/Standard auth');
                auth = await Authenticator.getAuth(nick);
            }

            if (!modManager || typeof modManager.syncLatestPack !== 'function') throw new Error('El gestor del modpack no está disponible.');
            event.sender.send('launch-progress', { step: 'COMPROBANDO ACTUALIZACIONES DEL MODPACK…', progress: 2 });
            const profile = await modManager.syncLatestPack(progress => event.sender.send('launch-progress', progress));
            const targetVersion = profile.minecraftVersion;
            const loaderVersion = profile.loaderVersion;
            const javaVersion = Number(profile.javaVersion);
            discordManager.setActivity(`🎮 Jugando Minecraft ${targetVersion}`, `👤 Piloto: ${nick}`);
            
            // --- Java Auto-Installer Logic ---
            const runtimePath = path.join(app.getPath('userData'), `runtime-${javaVersion}`);
            const javaExe = process.platform === 'win32' ? 'java.exe' : 'java';
            
            const findJavaInDir = (dir) => {
                if (!fs.existsSync(dir)) return null;
                const entries = fs.readdirSync(dir);
                for (const ent of entries) {
                    const full = path.join(dir, ent);
                    const stat = fs.statSync(full);
                    if (stat.isDirectory()) {
                        const found = findJavaInDir(full);
                        if (found) return found;
                    } else if (ent.toLowerCase() === javaExe.toLowerCase()) {
                        if (full.toLowerCase().includes('bin')) return full; 
                    }
                }
                return null;
            };

            let internalJava = findJavaInDir(runtimePath);
            
            if (!internalJava && (!options.javaPath || !options.javaPath.trim())) {
                console.log(`Java ${javaVersion} runtime not found. Starting auto-download...`);
                event.sender.send('launch-progress', { step: `PREPARANDO MOTOR JAVA ${javaVersion}...`, progress: 5 });
                
                const javaZip = path.join(app.getPath('temp'), `java-runtime-${javaVersion}.zip`);
                const javaUrl = `https://api.adoptium.net/v3/binary/latest/${javaVersion}/ga/windows/x64/jre/hotspot/normal/eclipse?project=jdk`;

                try {
                    const response = await axios({ url: javaUrl, method: 'GET', responseType: 'stream', timeout: 30000 });
                    const writer = fs.createWriteStream(javaZip);
                    const totalLength = parseInt(response.headers['content-length'] || "50000000", 10);
                    let downloadedLength = 0;

                    response.data.on('data', (chunk) => {
                        downloadedLength += chunk.length;
                        const progress = 5 + Math.floor((downloadedLength / totalLength) * 85);
                        if (downloadedLength > 200 * 1024 * 1024) response.data.destroy(new Error('Java excede el límite esperado de 200 MB.'));
                        if (downloadedLength % (1024 * 1024) < 65536) { // Reduce IPC spam
                            event.sender.send('launch-progress', { step: `DESCARGANDO JAVA ${javaVersion}: ${Math.floor(downloadedLength / 1024 / 1024)}MB`, progress });
                        }
                    });

                    response.data.pipe(writer);
                    await new Promise((resolve, reject) => {
                        writer.on('finish', resolve);
                        writer.on('error', reject);
                        response.data.on('error', reject);
                    });

                    event.sender.send('launch-progress', { step: `EXTRAYENDO MOTOR JAVA ${javaVersion}...`, progress: 95 });
                    const zip = new AdmZip(javaZip);
                    zip.getEntries().forEach(entry => {
                        try {
                            zip.extractEntryTo(entry, runtimePath, true, true);
                        } catch (e) {
                            console.warn('Java extraction silent warning:', e.message);
                        }
                    });
                    if (fs.existsSync(javaZip)) fs.unlinkSync(javaZip);
                    
                    internalJava = findJavaInDir(runtimePath);
                    console.log(`Java ${javaVersion} Engine installed at:`, internalJava);
                } catch (err) {
                    console.error('Java Download Error:', err);
                            event.sender.send('launch-error', `No se pudo bajar Java ${javaVersion} automáticamente. Por favor instálalo manualmente.`);
                    return;
                }
            }

            const launchOptions = {
                clientPackage: null,
                authorization: auth,
                root: gameRoot,
                version: {
                    number: targetVersion,
                    type: "release"
                },
                "server": {
                    "ip": "na34.holy.gg",
                    "port": 26068
                },
                memory: {
                    min: "2G",
                    max: Math.max(2, Math.min(16, Number.parseInt(options.maxRam, 10) || 6, Math.max(2, Math.floor(os.totalmem() / (1024 ** 3)) - 1))) + "G"
                },
                customArgs: [
                    "--add-opens=java.base/java.lang.invoke=ALL-UNNAMED",
                    "--add-opens=java.base/java.util.jar=ALL-UNNAMED",
                    "--add-exports=java.base/sun.security.util=ALL-UNNAMED",
                    "-XX:+UseG1GC",
                    "-XX:+UnlockExperimentalVMOptions",
                    "-XX:G1NewSizePercent=20",
                    "-XX:G1ReservePercent=20",
                    "-XX:MaxGCPauseMillis=50",
                    "-XX:G1HeapRegionSize=32M"
                ],
                overrides: {
                    fw: {
                        version: "1.6.0"
                    }
                }
            };

            if (options.javaPath && options.javaPath.trim()) {
                launchOptions.javaPath = options.javaPath.trim();
            } else if (internalJava) {
                console.log('Using Internal Java Engine:', internalJava);
                launchOptions.javaPath = internalJava;
            }

            console.log(`NeoForge is requested (${loaderVersion}). Preparing NeoForge auto-downloader...`);
            event.sender.send('launch-progress', { step: 'PREPARANDO NEOFORGE...' });
            const neoforgeDir = path.join(app.getPath('appData'), '.lospapus-minecraft', 'neoforge-installers');
            const neoforgeFile = path.join(neoforgeDir, `neoforge-${loaderVersion}-installer.jar`);
            const neoforgeUrl = `https://maven.neoforged.net/releases/net/neoforged/neoforge/${loaderVersion}/neoforge-${loaderVersion}-installer.jar`;
            if (!fs.existsSync(neoforgeFile) || fs.statSync(neoforgeFile).size < 100000) {
                if (!fs.existsSync(neoforgeDir)) fs.mkdirSync(neoforgeDir, { recursive: true });
                if (fs.existsSync(neoforgeFile)) fs.unlinkSync(neoforgeFile);
                console.log(`Downloading NeoForge installer from: ${neoforgeUrl}`);
                event.sender.send('launch-progress', { step: 'DESCARGANDO INSTALADOR DE NEOFORGE...' });
                await downloadFile(neoforgeUrl, neoforgeFile);
            } else {
                event.sender.send('launch-progress', { step: 'INSTALADOR DE NEOFORGE ENCONTRADO...' });
            }
            launchOptions.forge = neoforgeFile;

            console.log(`Starting Minecraft ${targetVersion} with NeoForge ${loaderVersion}.`);
            
            try {
                launcher.launch(launchOptions);
            } catch (launchErr) {
                console.error('Immediate Launch Error:', launchErr);
                event.sender.send('launch-error', launchErr.message);
                return;
            }

            let gameLogSent = false;
            
            launcher.on('debug', (e) => {
                console.log('[MC-DEBUG]', e);
                event.sender.send('launch-log', `[DEBUG] ${e}`);
            });

            launcher.on('data', (e) => {
                console.log('[MC-DATA]', e);
                event.sender.send('launch-log', `[DATA] ${e}`);
                if (!gameLogSent) {
                    gameLogSent = true;
                    event.sender.send('game-started');
                }
            });

            launcher.on('progress', (e) => {
                event.sender.send('launch-progress', e);
            });

            launcher.on('close', (e) => {
                console.log('[MC-CLOSE]', e);
                event.sender.send('launch-finished', e);
            });

            launcher.on('error', (e) => {
                console.error('[MC-ERROR]', e);
                event.sender.send('launch-error', String(e));
            });

        } catch (error) { 
            console.error('Launch Wrapper Error:', error);
            event.sender.send('launch-error', error.message);
        }
    });

    return { downloadFile };
}

module.exports = { init };
