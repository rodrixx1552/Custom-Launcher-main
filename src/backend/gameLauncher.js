const fs = require('fs');
const path = require('path');
const axios = require('axios');
const AdmZip = require('adm-zip');
const { Client, Authenticator } = require("minecraft-launcher-core");

function init(ipcMain, app, context) {
    const launcher = new Client();
    const { discordManager, authManager } = context;

    async function downloadFile(url, dest) {
        if (!fs.existsSync(path.dirname(dest))) fs.mkdirSync(path.dirname(dest), { recursive: true });
        try {
            const writer = fs.createWriteStream(dest);
            const response = await axios({ url, method: 'GET', responseType: 'stream' });
            response.data.pipe(writer);
            return await new Promise((resolve, reject) => {
                writer.on('finish', resolve);
                writer.on('error', reject);
                response.data.on('error', reject);
            });
        } catch (err) {
            if (fs.existsSync(dest)) fs.unlinkSync(dest);
            throw err;
        }
    }

    ipcMain.on('launch-game', async (event, options) => {
        console.log('Launching game with options:', JSON.stringify(options, null, 2));
        const { nick, version, account } = options;
        const accountUuid = account?.uuid || options.accountUuid;
        
        discordManager.setActivity(`🎮 Jugando Minecraft ${version}`, `👤 Piloto: ${nick}`);
        
        try {
            let auth;
            if (account && account.type === 'microsoft') {
                console.log('Auth: Using Microsoft Session');
                auth = {
                    access_token: account.access_token,
                    client_token: null,
                    uuid: account.uuid,
                    name: account.name,
                    user_properties: '{}'
                };
            } else if (accountUuid) {
                console.log('Auth: Searching for account in storage');
                const accounts = authManager.getAccountsLocal();
                const storedAccount = accounts.find(a => a.uuid === accountUuid);
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
            
            // --- Java Auto-Installer Logic ---
            const runtimePath = path.join(app.getPath('userData'), 'runtime');
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
                    } else if (ent === javaExe || ent === (javaExe + '.exe')) {
                        if (full.toLowerCase().includes('bin')) return full; 
                    }
                }
                return null;
            };

            let internalJava = findJavaInDir(runtimePath);
            
            if (!internalJava && (!options.javaPath || !options.javaPath.trim())) {
                console.log('Java Engine not found. Starting auto-download...');
                event.sender.send('launch-progress', { step: 'PREPARANDO MOTOR JAVA...', progress: 5 });
                
                const javaZip = path.join(app.getPath('temp'), 'java-runtime.zip');
                const javaUrl = "https://api.adoptium.net/v3/binary/latest/17/ga/windows/x64/jre/hotspot/normal/eclipse?project=jdk";

                try {
                    const response = await axios({ url: javaUrl, method: 'GET', responseType: 'stream', timeout: 30000 });
                    const writer = fs.createWriteStream(javaZip);
                    const totalLength = parseInt(response.headers['content-length'] || "50000000"); // 50MB fallback
                    let downloadedLength = 0;

                    response.data.on('data', (chunk) => {
                        downloadedLength += chunk.length;
                        const progress = 5 + Math.floor((downloadedLength / totalLength) * 85);
                        if (downloadedLength % (1024 * 1024) < 65536) { // Reduce IPC spam
                            event.sender.send('launch-progress', { step: `DESCARGANDO JAVA: ${Math.floor(downloadedLength / 1024 / 1024)}MB`, progress });
                        }
                    });

                    response.data.pipe(writer);
                    await new Promise((resolve, reject) => {
                        writer.on('finish', resolve);
                        writer.on('error', reject);
                    });

                    event.sender.send('launch-progress', { step: 'EXTRAYENDO MOTOR...', progress: 95 });
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
                    console.log('Java Engine installed at:', internalJava);
                } catch (err) {
                    console.error('Java Download Error:', err);
                    event.sender.send('launch-error', "No se pudo bajar Java automáticamente. Por favor instálalo manualmente.");
                    return;
                }
            }

            const launchOptions = {
                clientPackage: null,
                authorization: auth,
                root: path.join(app.getPath('appData'), '.lospapus-minecraft'),
                version: {
                    number: version,
                    type: "release"
                },
                "server": {
                    "ip": "na34.holy.gg",
                    "port": 26068
                },
                memory: {
                    min: "2G",
                    max: (options.maxRam || "6") + "G"
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

            if (options.forgeVersion) {
                console.log('Forge is requested. Preparing Forge auto-downloader...');
                event.sender.send('launch-progress', { step: 'PREPARING FORGE...' });
                
                const forgeDir = path.join(app.getPath('appData'), '.lospapus-minecraft', 'forge-installers');
                const forgeFile = path.join(forgeDir, `forge-${version}-${options.forgeVersion}-installer.jar`);
                const forgeUrl = `https://maven.minecraftforge.net/net/minecraftforge/forge/${version}-${options.forgeVersion}/forge-${version}-${options.forgeVersion}-installer.jar`;

                if (!fs.existsSync(forgeFile)) {
                    if (!fs.existsSync(forgeDir)) fs.mkdirSync(forgeDir, { recursive: true });
                    console.log(`Downloading forge installer from: ${forgeUrl}`);
                    event.sender.send('launch-progress', { step: 'DOWNLOADING FORGE INSTALLER...' });
                    await downloadFile(forgeUrl, forgeFile);
                } else {
                    console.log(`Forge installer found locally: ${forgeFile}`);
                    event.sender.send('launch-progress', { step: 'FORGE INSTALLER FOUND...' });
                }

                launchOptions.forge = forgeFile; 
            }

            console.log('Launching with options:', JSON.stringify(launchOptions, null, 2));
            
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
