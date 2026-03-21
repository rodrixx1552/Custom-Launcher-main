const remoteMain = require('@electron/remote/main')
remoteMain.initialize()

const { app, BrowserWindow, ipcMain, screen, shell, dialog } = require("electron");
// app.disableHardwareAcceleration(); // RE-ENABLED GPU for BETTER FPS and SMOOTH TRANSITIONS 🚀 ✅
const ejse = require('ejs-electron')
const path = require("path");
const fs = require("fs");
const url = require("url");
const settings = require("./js/json/settings.json");
const ui = settings.launcher.ui;
const lang = require(`./assets/lang/${settings.launcher.ui.default_lang}.json`);
const axios = require('axios');
const https = require('https');
const translations = require("./js/json/lang.json");
const AdmZip = require('adm-zip');
const { spawn } = require('child_process');


// check if the environment is dev
if(settings.launcher.debug.environment !== 'production') {
    require('electron-reload')(__dirname, {
        electron: path.join(__dirname, '../node_modules', '.bin', 'electron')
    });
}

// Get the splash text from file 
const getSplashesText = () => {

    let data  = fs.readFileSync(path.join(__dirname, 'assets', 'splashes_texts.json'), 'utf8')
    let splashes = JSON.parse(data)

    let random = Math.floor(Math.random() * splashes.es.length)

    return splashes.es[random]
    
}

// Main Window
const createWindow = () => {
    
    const { width, height } = screen.getPrimaryDisplay().workAreaSize;

    let win = new BrowserWindow({
        width: Math.floor(width * 0.85),
        height: Math.floor(height * 0.9),
        title: ui.title,
        resizable: false,
        frame: false,
        icon: path.join(__dirname, 'assets', 'los_papus', 'logo.png'),
        webPreferences:{
            preload: path.join(__dirname, '/js/preload.js'),
            nodeIntegration: false,
            contextIsolation: true,
            enableRemoteModule: false
        }
    });

    win.webContents.session.webRequest.onHeadersReceived((details, callback) => {
        callback({
          responseHeaders: {
            ...details.responseHeaders,
            'Content-Security-Policy': [
                "default-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://fonts.gstatic.com https://raw.githubusercontent.com https://mc-heads.net; " +
                "script-src 'self' 'unsafe-inline' https://unpkg.com https://www.youtube.com https://s.ytimg.com https://raw.githubusercontent.com 'unsafe-eval'; " +
                "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://unpkg.com; " +
                "media-src 'self' data: https:; " +
                "img-src 'self' data: https: https://mc-heads.net https://mineskin.org https://i.ytimg.com https://raw.githubusercontent.com; " +
                "frame-src https://www.youtube.com; " +
                "connect-src 'self' https://raw.githubusercontent.com https://api.mcsrvstat.us https://api.mcstatus.io https://api.minecraftservices.com https://api.adoptium.net;"
            ]
          }
        })
      })

    remoteMain.enable(win.webContents)
    win.removeMenu();

    if (process.env.NODE != 'production') { win.openDevTools() }

    ejse.data('splash_text', getSplashesText())
    ejse.data('title', ui.title);
    ejse.data('srcIcon', path.join(__dirname, 'assets', ui.icon_name))
    ejse.data('bgId', path.join(__dirname, 'assets', 'backgrounds', `${ui.default_background}`)) // Get background based on what background is set in settings.json
    ejse.data('helloworld', lang.frontend.buttons.test_text) // Prueba
    
    win.loadURL(url.format({
        protocol: 'file:',
        pathname: path.join(__dirname, "views", 'app.ejs'),
    }))

    win.on('closed', () => { 
        win = null;
    });
    return win;
};

ipcMain.on('window-control', (event, action) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win) {
        if (action === 'close') win.close();
        if (action === 'minimize') win.minimize();
    }
});

ipcMain.on('open-external', (event, targetUrl) => {
    shell.openExternal(targetUrl);
});

ipcMain.on('log-ui-error', (event, err) => {
    console.log('\x1b[31m[UI-CLIENT-ERROR]\x1b[0m', err);
});

const { Client, Authenticator } = require("minecraft-launcher-core");
const launcher = new Client();

const DiscordRPC = require('discord-rpc');
const clientId = '1484949908518600824'; // LosPapusLover App ID
const rpc = new DiscordRPC.Client({ transport: 'ipc' });

let rpcConnected = false;
let rpcStartTimestamp = new Date();

async function setActivity(details, state) {
    if (!rpcConnected) return;
    rpc.setActivity({
        details: details || '🏠 En el Menú Principal',
        state: state || 'LosPapusLover Launcher',
        startTimestamp: rpcStartTimestamp,
        largeImageKey: 'logo',
        largeImageText: 'LosPapusLover Launcher',
        instance: false,
    }).catch(err => console.error('Discord RPC Activity Error:', err));
}

rpc.on('ready', () => {
    console.log('Discord RPC Ready - LosPapusLover');
    rpcConnected = true;
    rpcStartTimestamp = new Date();
    setActivity('🏠 En el Menú Principal', 'LosPapusLover Launcher');
});

rpc.on('disconnected', () => {
    rpcConnected = false;
    console.log('Discord RPC Disconnected');
});

rpc.login({ clientId }).catch(err => {
    console.log('Discord not detected or connection failed:', err.message);
    rpcConnected = false;
});

// Updated launcher handler to support saved accounts
ipcMain.on('launch-game', async (event, options) => {
    console.log('Launching game with options:', JSON.stringify(options, null, 2));
    const { nick, version, account } = options;
    const accountUuid = account?.uuid || options.accountUuid;
    
    setActivity(`🎮 Jugando Minecraft ${version}`, `👤 Piloto: ${nick}`);
    
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
            const accounts = getAccounts();
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
            root: path.join(app.getPath('userData'), 'minecraft'),
            version: {
                number: version,
                type: "release"
            },
            memory: {
                min: "1G",
                max: (options.maxRam || "3") + "G"
            },
            customArgs: [
                "--add-opens=java.base/java.lang.invoke=ALL-UNNAMED",
                "--add-opens=java.base/java.util.jar=ALL-UNNAMED",
                "--add-exports=java.base/sun.security.util=ALL-UNNAMED"
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
            
            const forgeDir = path.join(app.getPath('userData'), 'minecraft', 'forge-installers');
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
        launcher.launch(launchOptions);

        let gameLaunched = false;
        launcher.on('debug', (e) => console.log('Launcher Debug:', e));
        launcher.on('data', (e) => {
            console.log('Launcher Data:', e);
            if (!gameLaunched) {
                gameLaunched = true;
                event.sender.send('game-started');
            }
        });
        launcher.on('progress', (e) => event.sender.send('launch-progress', e));
        launcher.on('close', (e) => event.sender.send('launch-finished', e));

    } catch (error) { 
        console.error('Launch Error:', error);
        event.sender.send('launch-error', error.message);
    }
});

ipcMain.on('select-file', (event) => {
    dialog.showOpenDialog({
        properties: ['openFile'],
        filters: [{ name: 'Images', extensions: ['png'] }]
    }).then(result => {
        if (!result.canceled && result.filePaths.length > 0) {
            const filePath = result.filePaths[0];
            const data = fs.readFileSync(filePath).toString('base64');
            event.sender.send('file-selected', `data:image/png;base64,${data}`);
        }
    }).catch(err => {
        console.error(err);
    });
});


const mcping = require('mcping-js');
const msmc = require('msmc');
let authManager = null;
try {
    const Auth = msmc.Auth || msmc.default?.Auth || msmc.default;
    if (typeof Auth === 'function') {
        authManager = new Auth("select_account");
        console.log('MSMC Auth Manager initialized successfully (Auth Class).');
    } else if (msmc.fastLaunch) {
        // Fallback for different msmc versions
        authManager = msmc;
        console.log('MSMC detected as fastLaunch-capable object.');
    }
} catch (e) {
    console.error('CRITICAL: Failed to initialize msmc Auth:', e.message);
}

// Path for accounts file
const accountsPath = path.join(app.getPath('userData'), 'accounts.json');

// Helper to save accounts
function saveAccounts(accounts) {
    fs.writeFileSync(accountsPath, JSON.stringify(accounts, null, 2));
}

// Helper to get accounts
function getAccounts() {
    if (!fs.existsSync(accountsPath)) return [];
    try {
        return JSON.parse(fs.readFileSync(accountsPath, 'utf8'));
    } catch (e) {
        return [];
    }
}

ipcMain.on('get-accounts', (event) => {
    event.sender.send('accounts-list', getAccounts());
});

ipcMain.on('login-microsoft', async (event) => {
    console.log('IPC: login-microsoft triggered');
    try {
        if (!authManager) {
             throw new Error("Auth system failed to initialize. Re-attempting manual setup...");
        }

        console.log('MSMC: Launching manual browser window (STABILITY MODE)...');
        
         const xboxManagerResult = await new Promise((resolve, reject) => {
            const loginWindow = new BrowserWindow({
                width: 500,
                height: 650,
                resizable: false,
                title: 'Microsoft Login',
                alwaysOnTop: true,
                webPreferences: {
                    nodeIntegration: false,
                    contextIsolation: true,
                    partition: 'session_msmc_' + Date.now()
                }
            });

            const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';
            
            loginWindow.setMenu(null);
            
            // Generate link
            let loginUrl;
            try {
                loginUrl = (typeof authManager?.createLink === 'function') ? authManager.createLink() : 
                           (typeof authManager?.getAuthUrl === 'function' ? authManager.getAuthUrl() : "https://login.live.com/oauth20_authorize.srf");
            } catch(e) {
                loginUrl = "https://login.live.com/oauth20_authorize.srf"; 
            }

            loginWindow.loadURL(loginUrl, { userAgent });

            let processed = false;
            const handleRedirect = async (url) => {
                if (processed || !url.includes("code=")) return;
                processed = true;
                console.log('MSMC: Code captured. Processing login...');
                
                try {
                    let code;
                    if (typeof authManager?.getCode === 'function') {
                        code = authManager.getCode(url);
                    } else {
                        const params = new URL(url).searchParams;
                        code = params.get('code');
                    }
                    
                    if (!code) throw new Error("No se pudo extraer el código de Microsoft.");
                    
                    const result = await (authManager.login ? authManager.login(code) : authManager.authenticate(code));
                    loginWindow.removeAllListeners('closed');
                    loginWindow.close();
                    resolve(result);
                } catch (e) {
                    console.error('MSMC Login Error handler:', e);
                    processed = false; 
                    reject(e);
                }
            };

            loginWindow.on('closed', () => { if (!processed) reject(new Error("error.gui.closed")); });
            loginWindow.webContents.on('will-redirect', (event, url) => handleRedirect(url));
            loginWindow.webContents.on('did-get-redirect-request', (event, oldUrl, newUrl) => handleRedirect(newUrl));
            loginWindow.webContents.on('will-navigate', (event, url) => handleRedirect(url));
        });

        console.log('MSMC: Auth successful, fetching Minecraft profile...');
        let mcToken;
        try {
            if (typeof xboxManagerResult.getMinecraft === 'function') {
                mcToken = await xboxManagerResult.getMinecraft();
            } else if (xboxManagerResult.mcToken) {
                mcToken = xboxManagerResult.mcToken;
            } else {
                mcToken = xboxManagerResult;
            }
        } catch(mcErr) {
            console.error('MSMC getMinecraft Error:', mcErr);
            throw new Error("No se pudo obtener el token de Minecraft. Revisa tu cuenta.");
        }
        
        if (!mcToken || (!mcToken.profile && !mcToken.name)) {
            throw new Error("No se encontró un perfil de Minecraft en esta cuenta.");
        }

        const account = {
            name: mcToken.profile?.name || mcToken.name,
            uuid: mcToken.profile?.id || mcToken.uuid,
            access_token: mcToken.access_token,
            type: 'microsoft',
            meta: mcToken.profile || mcToken
        };

        let accounts = getAccounts();
        accounts = accounts.filter(a => a.uuid !== account.uuid);
        accounts.push(account);
        saveAccounts(accounts);

        console.log('MSMC: Login success for', account.name);
        event.sender.send('login-success', account);
    } catch (err) {
        console.error('--- MSMC FULL ERROR ---');
        console.error(err);
        
        let errorMsg = 'Error occurred during Microsoft login.';
        
        if (typeof err === 'string') errorMsg = err;
        else if (err.message) errorMsg = err.message;

        if (errorMsg.includes('error.gui.closed')) {
            errorMsg = 'La ventana de login fue cerrada antes de terminar.';
        } else if (errorMsg.includes('ERR_CONNECTION_REFUSED') || errorMsg.includes('timeout')) {
            errorMsg = 'Error de conexión. Revisa tu internet o la hora de tu PC.';
        } else if (errorMsg.includes('profile') || errorMsg.includes('404')) {
            errorMsg = 'No tienes un perfil de Minecraft Java creado en esta cuenta.';
        }
        
        event.sender.send('login-error', errorMsg);
    }
});

ipcMain.on('add-offline-account', (event, name) => {
    console.log('IPC: add-offline-account triggered for', name);
    const crypto = require('crypto');
    // Generate a deterministic UUID V3/V4-like for offline accounts
    const hash = crypto.createHash('md5').update('OfflinePlayer:' + name).digest('hex');
    const pseudoUuid = `${hash.substring(0,8)}-${hash.substring(8,12)}-${hash.substring(12,16)}-${hash.substring(16,20)}-${hash.substring(20,32)}`;
    
    const account = {
        name: name,
        uuid: pseudoUuid, 
        type: 'offline'
    };
    let accounts = getAccounts();
    // Filter by name for offline to avoid duplicates
    accounts = accounts.filter(a => a.name.toLowerCase() !== name.toLowerCase());
    accounts.push(account);
    saveAccounts(accounts);
    console.log('Offline Account Saved:', name, 'UUID:', pseudoUuid);
    event.sender.send('login-success', account);
});

ipcMain.on('remove-account', (event, uuid) => {
    let accounts = getAccounts();
    accounts = accounts.filter(a => a.uuid !== uuid);
    saveAccounts(accounts);
    event.sender.send('accounts-list', accounts);
});

ipcMain.on('ping-server', async (event, serverIP) => {
    const headers = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36' };
    
    try {
        console.log(`Radar Dual: Consultando estado para ${serverIP}...`);
        
        // --- RADAR 1: mcsrvstat.us ---
        let response = await axios.get(`https://api.mcsrvstat.us/2/${serverIP}`, { headers, timeout: 6000 });
        let data = response.data;
        let playersList = data.players?.list ? data.players.list.map(name => ({ name })) : [];

        // --- RADAR 2 (Respaldo): mcstatus.io si el primero no trae nombres ---
        if (data.online && playersList.length === 0) {
            console.log("Radar 1 no detectó nombres. Activando Radar 2 (mcstatus.io)...");
            const res2 = await axios.get(`https://api.mcstatus.io/v2/status/${serverIP}`, { headers, timeout: 6000 });
            const data2 = res2.data;
            if (data2.online && data2.players?.list) {
                playersList = data2.players.list.map(p => ({ name: p.name_clean || p.name }));
            }
        }

        if (data.online) {
            event.sender.send('ping-result', { 
                online: true, 
                version: data.version || 'Unknown', 
                players: {
                    online: data.players?.online || 0,
                    max: data.players?.max || 0,
                    list: playersList
                },
                description: data.motd?.clean?.[0] || 'Minecraft Server'
            });
        } else {
            event.sender.send('ping-result', { online: false });
        }
    } catch (err) {
        console.warn(`Radar Dual Fallido para ${serverIP}:`, err.message);
        event.sender.send('ping-result', { online: false, error: err.message });
    }
});

ipcMain.on('upload-skin', async (event, { accessToken, base64Image }) => {
    try {
        const buffer = Buffer.from(base64Image.split(',')[1], 'base64');
        const formData = new (require('form-data'))();
        formData.append('variant', 'classic'); // or 'slim'
        formData.append('file', buffer, { filename: 'skin.png' });

        const response = await axios.put('https://api.minecraftservices.com/minecraft/profile/skins', formData, {
            headers: {
                ...formData.getHeaders(),
                'Authorization': `Bearer ${accessToken}`
            }
        });

        event.sender.send('skin-upload-success');
    } catch (err) {
        console.error('Skin Upload Error:', err.response?.data || err.message);
        event.sender.send('skin-upload-error', err.response?.data?.errorMessage || 'Failed to upload skin to Mojang.');
    }
});


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


async function getMediafireDirectLink(url) {
    if (!url.includes('mediafire.com')) return url;
    try {
        console.log('Resolving Mediafire Link:', url);
        const response = await axios.get(url, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36' }
        });

        // Regex patterns to find the direct download link
        const patterns = [
            /aria-label="Download file"\s+href="([^"]+)"/i, // Primary download button
            /href="((?:https?:\/\/)?download[^"]+\.mediafire\.com\/[^"]+)"/i, // Direct download link within the page
            /window\.location\.href\s*=\s*['"](https?:\/\/[^'"]+\.mediafire\.com\/[^'"]+)['"]/i // JavaScript redirect
        ];

        for (const pattern of patterns) {
            const match = response.data.match(pattern);
            if (match && match[1]) {
                console.log('Mediafire Direct Link Resolved:', match[1]);
                return match[1];
            }
        }
        
        // Fallback: If no direct link found, try to find the "download" button and follow its link
        const downloadButtonMatch = response.data.match(/<a[^>]+href="([^"]+)"[^>]*>Download<\/a>/i);
        if (downloadButtonMatch && downloadButtonMatch[1]) {
            console.log('Mediafire Resolution: Found download button, following link:', downloadButtonMatch[1]);
            const followResponse = await axios.get(downloadButtonMatch[1], {
                headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36' }
            });
            const finalMatch = followResponse.data.match(/href="((?:https?:\/\/)?download[^"]+\.mediafire\.com\/[^"]+)"/i);
            if (finalMatch && finalMatch[1]) {
                console.log('Mediafire Direct Link Resolved (followed):', finalMatch[1]);
                return finalMatch[1];
            }
        }

        console.warn('Mediafire Resolution Warning: No direct link found with current patterns.');
        throw new Error('No direct download link found on Mediafire page.');

    } catch (e) {
        console.error('Mediafire Resolution Error:', e.message);
        throw new Error(`Failed to resolve Mediafire link: ${e.message}`);
    }
}

// =====================================================================
// FEATURE 5: Dynamic Modpack URL - reads local launcher-config.json
// =====================================================================
// FEATURE 1: OTA Version Checker - Fetches remote config from GitHub
// =====================================================================
const CURRENT_VERSION = require('../package.json').version;
const REMOTE_CONFIG_URL = 'https://raw.githubusercontent.com/rodrixx1552/Custom-Launcher-main/main/src/launcher-config.json';
const REMOTE_NEWS_URL = 'https://raw.githubusercontent.com/rodrixx1552/Custom-Launcher-main/main/src/launcher-news.json';
const MODS_MANIFEST_URL = 'https://raw.githubusercontent.com/rodrixx1552/Custom-Launcher-main/main/src/mods.json';
const MODS_BASE_URL = 'https://raw.githubusercontent.com/rodrixx1552/Custom-Launcher-main/main/mods/';
const CONFIG_PATH = path.join(__dirname, 'launcher-config.json');

ipcMain.handle('get-server-ip', async () => {
    try {
        const config = await getRemoteConfig();
        if (config && config.server_ip) return config.server_ip;
    } catch (e) {
        console.warn('Failed to fetch remote server_ip', e);
    }
    try {
        if (fs.existsSync(CONFIG_PATH)) {
            const localConfig = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
            if (localConfig && localConfig.server_ip) return localConfig.server_ip;
        }
    } catch (e) {
        console.warn('Failed to fetch local server_ip', e);
    }
    return 'sprat.aternos.host:44481';
});

async function getRemoteConfig() {
    try {
        console.log('OTA: Fetching remote config from:', REMOTE_CONFIG_URL);
        const response = await axios.get(`${REMOTE_CONFIG_URL}?t=${Date.now()}`, { 
            timeout: 10000,
            headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' }
        });
        if (response.data && response.data.latest_launcher_version) {
            console.log('OTA: Remote config fetched successfully.');
            return response.data;
        }
    } catch (e) {
        console.warn('OTA: Remote fetch failed or timed out. Falling back to local config.', e.message);
    }
    
    // Fallback to local
    try {
        if (fs.existsSync(CONFIG_PATH)) {
            return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
        }
    } catch (e) { /* ignore */ }
    return {};
}

function getModpackUrl() {
    // We use the local file for modpack_url initially, but we could also use remote
    try {
        const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
        if (config.modpack_url) return config.modpack_url;
    } catch(e) {}
    return 'https://www.mediafire.com/file/la1uhes3g1agnzl/mods.zip/file';
}

// Compare semver strings, returns true if remote > local
function isNewerVersion(remote, local) {
    try {
        const r = remote.split('.').map(Number);
        const l = local.split('.').map(Number);
        const maxLength = Math.max(r.length, l.length);
        for (let i = 0; i < maxLength; i++) {
            const vRemote = r[i] || 0;
            const vLocal = l[i] || 0;
            if (vRemote > vLocal) return true;
            if (vRemote < vLocal) return false;
        }
    } catch (e) { /* ignore */ }
    return false;
}

// Check for launcher updates on window ready
async function checkForUpdates(win) {
    try {
        const config = await getRemoteConfig();
        const latestVersion = config.latest_launcher_version || CURRENT_VERSION;
        const downloadUrl = config.launcher_download_url || '';
        
        console.log(`[OTA Checker] Local: ${CURRENT_VERSION} | Remote: ${latestVersion}`);
        
        if (isNewerVersion(latestVersion, CURRENT_VERSION)) {
            console.log(`OTA: UPDATE AVAILABLE -> ${latestVersion}`);
            setTimeout(() => {
                if (win && !win.isDestroyed()) {
                    win.webContents.send('update-available', { 
                        version: latestVersion, 
                        current: CURRENT_VERSION,
                        url: downloadUrl || 'https://github.com/rodrixx1552/Custom-Launcher-main/releases'
                    });
                }
            }, 6000);
        } else {
            console.log('OTA: Launcher is up to date.');
        }
    } catch (e) {
        console.warn('OTA Check failed:', e.message);
    }
}

ipcMain.on('sync-modpacks', async (event) => {
    let manifestSuccess = false;
    const modsPath = path.join(app.getPath('userData'), 'minecraft', 'mods');
    const tempZip = path.join(app.getPath('temp'), 'modpack.zip');

    try {
        event.sender.send('sync-progress', { step: 'SCANNING CLOUD...', progress: 5 });
        console.log('OTA Mods: Fetching manifest from:', MODS_MANIFEST_URL);
        const response = await axios.get(MODS_MANIFEST_URL, { timeout: 10000 });
        const modsToList = response.data;

        if (Array.isArray(modsToList)) {
            console.log(`OTA Mods: Manifest found with ${modsToList.length} mods.`);
            if (!fs.existsSync(modsPath)) fs.mkdirSync(modsPath, { recursive: true });

            // 1. CLEANUP: Delete local mods not in manifest
            event.sender.send('sync-progress', { step: 'CLEANING MATRIX...', progress: 15 });
            const localFiles = fs.readdirSync(modsPath).filter(f => f.endsWith('.jar') || f.endsWith('.jar.disable'));
            for (const file of localFiles) {
                if (!modsToList.find(m => m.name === file)) {
                    console.log('OTA Mods: Removing extra mod:', file);
                    fs.unlinkSync(path.join(modsPath, file));
                }
            }

            // 2. DOWNLOAD: Missing mods
            for (let i = 0; i < modsToList.length; i++) {
                const mod = modsToList[i];
                const dest = path.join(modsPath, mod.name);
                const progress = 20 + Math.floor((i / modsToList.length) * 75);

                if (!fs.existsSync(dest)) {
                    event.sender.send('sync-progress', { step: `DOWNLOADING: ${mod.name}`, progress });
                    console.log('OTA Mods: Downloading missing mod:', mod.name);
                    await downloadFile(MODS_BASE_URL + encodeURIComponent(mod.name), dest);
                }
            }

            manifestSuccess = true;
            event.sender.send('sync-progress', { step: 'SYNC COMPLETE!', progress: 100 });
            event.sender.send('sync-finished');
        }
    } catch (err) {
        console.warn('OTA Mods: Incremental sync failed, falling back to ZIP.', err.message);
    }

    if (!manifestSuccess) {
        // FALLBACK: ZIP METHOD
        try {
            event.sender.send('sync-progress', { step: 'FALLBACK: LOADING ZIP...', progress: 5 });
            const mediafireUrl = getModpackUrl();
            const directUrl = await getMediafireDirectLink(mediafireUrl);
            await downloadFile(directUrl, tempZip);
            const zip = new AdmZip(tempZip);
            const rootPath = path.join(app.getPath('userData'), 'minecraft');
            zip.extractAllTo(rootPath, true);
            if (fs.existsSync(tempZip)) fs.unlinkSync(tempZip);
            event.sender.send('sync-progress', { step: 'SYNC COMPLETE!', progress: 100 });
            event.sender.send('sync-finished');
        } catch (zipErr) {
            console.error('Sync Error Final Fallback:', zipErr);
            event.sender.send('sync-error', 'Matrix error: ' + zipErr.message);
            if (fs.existsSync(tempZip)) fs.unlinkSync(tempZip);
        }
    }
});

ipcMain.handle('check-mods-status', async () => {
    try {
        const modsPath = path.join(app.getPath('userData'), 'minecraft', 'mods');
        if (!fs.existsSync(modsPath)) return true;

        const response = await axios.get(MODS_MANIFEST_URL, { timeout: 5000 });
        const remoteMods = response.data;
        if (!Array.isArray(remoteMods)) return typeof remoteMods === 'object' && remoteMods.length > 0; // if it is an object but not array, check its length if it has one

        if (Array.isArray(remoteMods)) {
            const localFiles = fs.readdirSync(modsPath).filter(f => f.endsWith('.jar') || f.endsWith('.jar.disable'));
            for (const mod of remoteMods) {
                if (!localFiles.includes(mod.name)) return true;
            }
        }
        return false;
    } catch (e) {
        return false;
    }
});

// =====================================================================
// FEATURE 2: Mod List fetching + Toggle Mod Enable/Disable
// =====================================================================
ipcMain.on('get-mods-list', (event) => {
    try {
        const modsPath = path.join(app.getPath('userData'), 'minecraft', 'mods');
        if (!fs.existsSync(modsPath)) {
            event.sender.send('mods-list', []);
            return;
        }

        const files = fs.readdirSync(modsPath).filter(f => f.endsWith('.jar') || f.endsWith('.jar.disable'));
        const mods = files.map(filename => {
            const stat = fs.statSync(path.join(modsPath, filename));
            const enabled = filename.endsWith('.jar');
            const baseName = filename.replace('.jar.disable', '').replace('.jar', '');
            let name = baseName.replace(/[\-_]/g, ' ').replace(/\d+\.\d+(\.\d+)?/g, '').trim();
            name = name.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
            
            return {
                filename: filename,
                name: name || baseName,
                size: (stat.size / (1024 * 1024)).toFixed(2) + ' MB',
                enabled: enabled
            };
        });
        
        event.sender.send('mods-list', mods);
    } catch (e) {
        console.error('Error fetching mods:', e);
        event.sender.send('mods-list', []);
    }
});

ipcMain.on('toggle-mod', (event, filename) => {
    try {
        const modsPath = path.join(app.getPath('userData'), 'minecraft', 'mods');
        const filePath = path.join(modsPath, filename);
        
        if (filename.endsWith('.jar.disable')) {
            // Enable: rename to .jar
            const newPath = filePath.replace('.jar.disable', '.jar');
            fs.renameSync(filePath, newPath);
            console.log('Mod enabled:', filename);
            event.sender.send('mod-toggled', { success: true, filename, newFilename: path.basename(newPath), enabled: true });
        } else if (filename.endsWith('.jar')) {
            // Disable: rename to .jar.disable
            const newPath = filePath + '.disable';
            fs.renameSync(filePath, newPath);
            console.log('Mod disabled:', filename);
            event.sender.send('mod-toggled', { success: true, filename, newFilename: path.basename(newPath), enabled: false });
        }
    } catch (e) {
        console.error('Error toggling mod:', e);
        event.sender.send('mod-toggled', { success: false, error: e.message });
    }
});


ipcMain.on('start-auto-update', async (event, { url }) => {
    console.log('AUTO-UPDATE: Initialization started for:', url);
    const tempZip = path.join(app.getPath('temp'), 'launcher-update.zip');
    const extractPath = path.join(app.getPath('temp'), 'launcher-update-files');

    try {
        event.sender.send('auto-update-progress', { step: 'Resolviendo servidor...', progress: 10 });
        
        let downloadUrl = url;
        if (url.includes('mediafire.com')) {
            downloadUrl = await getMediafireDirectLink(url);
        }

        event.sender.send('auto-update-progress', { step: 'Descargando paquete...', progress: 20 });
        
        const response = await axios({
            url: downloadUrl,
            method: 'GET',
            responseType: 'stream'
        });

        const writer = fs.createWriteStream(tempZip);
        const totalLength = response.headers['content-length'];
        let downloadedLength = 0;

        response.data.on('data', (chunk) => {
            downloadedLength += chunk.length;
            const progress = 20 + Math.floor((downloadedLength / totalLength) * 50);
            event.sender.send('auto-update-progress', { step: 'Descargando...', progress });
        });

        response.data.pipe(writer);

        await new Promise((resolve, reject) => {
            writer.on('finish', resolve);
            writer.on('error', reject);
        });

        event.sender.send('auto-update-progress', { step: 'Extrayendo archivos...', progress: 80 });
        if (fs.existsSync(extractPath)) fs.rmSync(extractPath, { recursive: true, force: true });
        
        const zip = new AdmZip(tempZip);
        zip.getEntries().forEach(entry => {
            try {
                // Manually extract and ignore chmod errors
                zip.extractEntryTo(entry, extractPath, true, true);
            } catch (e) {
                console.warn('Silent update warning (chmod):', e.message);
            }
        });

        const appPath = path.dirname(process.execPath);
        const batchPath = path.join(app.getPath('temp'), 'launcher-updater.bat');
        
        let sourcePath = extractPath;
        const entries = fs.readdirSync(extractPath);
        if (entries.length === 1 && fs.statSync(path.join(extractPath, entries[0])).isDirectory()) {
            sourcePath = path.join(extractPath, entries[0]);
        }

        const exeName = path.basename(process.execPath);
        const batchScript = `@echo off
title LosPapus Update Center - VERSION UPDATE
color 0e
echo ======================================================
echo ACTUALIZADOR FINAL - PREPARANDO NUEVA VERSION
echo ======================================================
echo.
echo [1/4] Limpiando procesos bloqueantes...
taskkill /F /PID ${process.pid} /T > nul 2>&1
taskkill /F /IM "${exeName}" /T > nul 2>&1
taskkill /F /IM "LosPapus*" /T > nul 2>&1
taskkill /F /IM "electron*" /T > nul 2>&1
timeout /t 5 /nobreak > nul
echo.
echo [2/4] Eliminando app.asar viejo (evita conflicto de versiones)...
if exist "${appPath}\\resources\\app.asar" del /F /Q "${appPath}\\resources\\app.asar" > nul 2>&1
if exist "${appPath}\\resources\\app.asar.unpacked" rd /S /Q "${appPath}\\resources\\app.asar.unpacked" > nul 2>&1
echo.
echo [3/4] Sobrescribiendo archivos base...
robocopy "${sourcePath}" "${appPath}" /E /MOVE /IS /IT /MT /R:5 /W:2 /LOG:"%TEMP%\\DEBUG_ACTUALIZACION_ROBO.txt" /TEE
if %ERRORLEVEL% GEQ 8 (
    color 4f
    echo ERROR CRITICO: Robocopy fallo. Revisa %TEMP%\\DEBUG_ACTUALIZACION_ROBO.txt
    pause
)
echo.
echo [4/4] Reiniciando launcher en la nueva version...
start "" "${process.execPath}"
echo.
echo ======================================================
echo PROCESO FINALIZADO CON EXITO.
echo ======================================================
timeout /t 2 /nobreak > nul`;

        fs.writeFileSync(batchPath, batchScript, 'utf8');
        event.sender.send('auto-update-progress', { step: '¡Listo! Reiniciando...', progress: 100 });
        
        setTimeout(() => {
            spawn('cmd.exe', ['/c', 'start', 'cmd.exe', '/c', batchPath], { detached: true, stdio: 'ignore' }).unref();
            app.quit();
        }, 1500);

    } catch (err) {
        console.error('AUTO-UPDATE Error:', err);
        event.sender.send('auto-update-error', err.message);
    }
});


ipcMain.on('fetch-news', async (event) => {
    // Try remote news first
    try {
        console.log('OTA News: Fetching from:', REMOTE_NEWS_URL);
        const response = await axios.get(REMOTE_NEWS_URL, { 
            timeout: 8000,
            headers: { 'Cache-Control': 'no-cache' } 
        });
        
        if (response.data && response.data.posts) {
            console.log(`OTA News: Remote news loaded (${response.data.posts.length} items).`);
            event.sender.send('news-loaded', response.data);
            return;
        }
    } catch (e) {
        console.warn('OTA News: Remote fetch failed or invalid format:', e.message);
    }

    // Try local file next
    try {
        const localNewsPath = path.join(__dirname, 'launcher-news.json');
        if (fs.existsSync(localNewsPath)) {
            const data = JSON.parse(fs.readFileSync(localNewsPath, 'utf8'));
            if (data && data.posts) {
                console.log('OTA News: Local fallback news loaded.');
                event.sender.send('news-loaded', data);
                return;
            }
        }
    } catch (e) {
        console.warn('Local news file read failed:', e.message);
    }

    // Comprehensive Fallback
    console.log('OTA News: Using hardcoded emergency fallback.');
    event.sender.send('news-loaded', {
        title: 'LosPapus News Center',
        posts: [
            { 
                date: new Date().toLocaleDateString(), 
                tag: 'WELCOME', 
                text: '¡Bienvenidos al launcher LosPapus! Si no puedes ver las noticias, revisa tu conexión a internet.' 
            },
            {
                date: 'v2.0 PROTOTYPE',
                tag: 'INFO',
                text: 'El sistema de Microsoft y Offline ha sido optimizado. ¡Buen juego!'
            }
        ]
    });
});

app.whenReady().then(() => {
    const mainWin = createWindow();
    checkForUpdates(mainWin);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit()
});