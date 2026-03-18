const remoteMain = require('@electron/remote/main')
remoteMain.initialize()

const { app, BrowserWindow, ipcMain, screen, shell, dialog } = require("electron");
app.disableHardwareAcceleration(); // GPU Stability Fix for some windows systems
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
                "default-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://fonts.gstatic.com; " +
                "script-src 'self' 'unsafe-inline' https://unpkg.com 'unsafe-eval'; " +
                "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
                "img-src 'self' data: https: https://mc-heads.net https://mineskin.org; " +
                "connect-src 'self' https:;"
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
    const win = BrowserWindow.getFocusedWindow();
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
const clientId = '1085295551322050601'; // Default ID or a new one for LosPapus Lover
const rpc = new DiscordRPC.Client({ transport: 'ipc' });

let rpcConnected = false;

async function setActivity(details, state) {
    if (!rpcConnected) return;
    rpc.setActivity({
        details: details || 'En el Menú Principal',
        state: state || 'Listo para jugar',
        startTimestamp: new Date(),
        largeImageKey: 'logo',
        largeImageText: 'LosPapus Lover Launcher',
        instance: false,
    }).catch(err => console.error('Discord RPC Activity Error:', err));
}

rpc.on('ready', () => {
    console.log('Discord RPC Ready');
    rpcConnected = true;
    setActivity();
});

rpc.on('disconnected', () => {
    rpcConnected = false;
    console.log('Discord RPC Disconnected');
});

rpc.login({ clientId }).catch(err => {
    console.log('Discord not detected or connection failed.');
    rpcConnected = false;
});

// Updated launcher handler to support saved accounts
ipcMain.on('launch-game', async (event, options) => {
    console.log('Launching game with options:', JSON.stringify(options, null, 2));
    const { nick, version, account } = options;
    const accountUuid = account?.uuid || options.accountUuid;
    
    setActivity(`Jugando Minecraft ${version}`, `Como ${nick}`);
    
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
                zip.extractAllTo(runtimePath, true);
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

        launcher.on('debug', (e) => console.log('Launcher Debug:', e));
        launcher.on('data', (e) => console.log('Launcher Data:', e));
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
const Auth = msmc.Auth || msmc.default?.Auth || msmc.default;

const authManager = (typeof Auth === 'function') ? new Auth("select_account") : null;
if (!authManager) {
    console.error('CRITICAL: Failed to initialize msmc Auth.');
} else {
    console.log('MSMC Auth Manager initialized successfully.');
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
                    partition: 'persist:microsoft_login' // Clear session context
                }
            });

            // Modern User Agent to avoid 'browser not supported' or blank screens
            const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
            
            loginWindow.setMenu(null);
            loginWindow.loadURL(authManager.createLink(), { userAgent });

            loginWindow.on('closed', () => {
                reject(new Error("error.gui.closed"));
            });

            loginWindow.webContents.on('will-redirect', (event, url) => {
                console.log('MSMC Redirect Detected:', url);
                if (url.includes("code=")) {
                    loginWindow.removeAllListeners('closed');
                    loginWindow.close();
                    // Extract code and login
                    authManager.login(url).then(resolve).catch(reject);
                }
            });

            // Fallback for some redirect types or if the window doesn't fire will-redirect
            loginWindow.webContents.on('did-get-redirect-request', (event, oldUrl, newUrl) => {
                 if (newUrl.includes("code=")) {
                    loginWindow.removeAllListeners('closed');
                    loginWindow.close();
                    authManager.login(newUrl).then(resolve).catch(reject);
                }
            });
        });

        console.log('MSMC: Auth successful, fetching Minecraft profile...');
        const mcToken = await xboxManagerResult.getMinecraft();
        
        const account = {
            name: mcToken.profile.name,
            uuid: mcToken.profile.id,
            access_token: mcToken.access_token,
            type: 'microsoft',
            meta: mcToken.profile
        };

        let accounts = getAccounts();
        accounts = accounts.filter(a => a.uuid !== account.uuid);
        accounts.push(account);
        saveAccounts(accounts);

        console.log('MSMC: Login success for', account.name);
        event.sender.send('login-success', account);
    } catch (err) {
        console.error('MSMC Error Detail:', err);
        // Try to provide a more user-friendly message for common MSMC errors
        let errorMsg = err.message || 'Error occurred during Microsoft login.';
        if (errorMsg.includes('error.gui.closed')) errorMsg = 'Login window was closed before completion.';
        
        event.sender.send('login-error', errorMsg);
    }
});

ipcMain.on('add-offline-account', (event, name) => {
    console.log('IPC: add-offline-account triggered for', name);
    const account = {
        name: name,
        uuid: name, 
        type: 'offline'
    };
    let accounts = getAccounts();
    accounts = accounts.filter(a => a.name !== name);
    accounts.push(account);
    saveAccounts(accounts);
    console.log('Offline Account Saved:', name);
    event.sender.send('login-success', account);
});

ipcMain.on('remove-account', (event, uuid) => {
    let accounts = getAccounts();
    accounts = accounts.filter(a => a.uuid !== uuid);
    saveAccounts(accounts);
    event.sender.send('accounts-list', accounts);
});

ipcMain.on('ping-server', (event, serverIP) => {
    const [host, port] = serverIP.split(':');
    const server = new mcping.MinecraftServer(host, parseInt(port) || 25565);
    
    server.ping(5000, 763, (err, res) => {
        if (err) {
            console.warn(`Server Ping Failed (${host}):`, err.message);
            event.sender.send('ping-result', { online: false, error: err.message });
        } else {
            event.sender.send('ping-result', { 
                online: true, 
                version: res.version?.name || 'Unknown', 
                players: {
                    online: res.players?.online || 0,
                    max: res.players?.max || 0
                },
                description: res.description?.text || res.description || 'Minecraft Server'
            });
        }
    });
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
    const writer = fs.createWriteStream(dest);
    const response = await axios({ url, method: 'GET', responseType: 'stream' });
    response.data.pipe(writer);
    return new Promise((resolve, reject) => {
        writer.on('finish', resolve);
        writer.on('error', reject);
    });
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
const REMOTE_CONFIG_URL = 'https://raw.githubusercontent.com/rodrixx1552/Custom-Launcher-main/main/src/launcher-config.json';
const CONFIG_PATH = path.join(__dirname, 'launcher-config.json');
const NEWS_PATH = path.join(__dirname, 'launcher-news.json');
const CURRENT_VERSION = require('../package.json').version;

async function getRemoteConfig() {
    try {
        console.log('OTA: Fetching remote config from:', REMOTE_CONFIG_URL);
        const response = await axios.get(REMOTE_CONFIG_URL, { timeout: 10000 });
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
        for (let i = 0; i < 3; i++) {
            if ((r[i] || 0) > (l[i] || 0)) return true;
            if ((r[i] || 0) < (l[i] || 0)) return false;
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
                        url: downloadUrl || 'https://github.com/MilleniumMods/Custom-Launcher/releases'
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
    const tempZip = path.join(app.getPath('temp'), 'modpack.zip');
    try {
        event.sender.send('sync-progress', { step: 'LOADING CONFIG...', progress: 5 });
        const mediafireUrl = getModpackUrl();

        event.sender.send('sync-progress', { step: 'CONNECTING TO NEXUS...', progress: 10 });
        const directUrl = await getMediafireDirectLink(mediafireUrl);

        event.sender.send('sync-progress', { step: 'DOWNLOADING ARCHIVE...', progress: 20 });
        console.log('Download URL resolved:', directUrl);
        await downloadFile(directUrl, tempZip);

        if (!fs.existsSync(tempZip)) {
            throw new Error('Download failed - file not created.');
        }
        
        const stats = fs.statSync(tempZip);
        console.log('Downloaded File Size:', stats.size, 'bytes');
        
        if (stats.size < 1000) { 
             throw new Error(`Downloaded file is too small (${stats.size} bytes). Mediafire URL might be wrong.`);
        }

        event.sender.send('sync-progress', { step: 'DECOMPRESSING MATRIX...', progress: 60 });
        const zip = new AdmZip(tempZip);
        
        const rootPath = path.join(app.getPath('userData'), 'minecraft');
        if (!fs.existsSync(rootPath)) fs.mkdirSync(rootPath, { recursive: true });
        
        let hasRootModsFolder = false;
        zip.getEntries().forEach(entry => {
            if (entry.entryName.startsWith('mods/') || entry.entryName.startsWith('mods\\')) {
                hasRootModsFolder = true;
            }
        });

        if (hasRootModsFolder) {
            console.log('Zip has mods/ structure. Extracting to .minecraft root');
            zip.extractAllTo(rootPath, true);
        } else {
            console.log('Zip contains flat files. Extracting directly to .minecraft/mods');
            const modsPath = path.join(rootPath, 'mods');
            if (!fs.existsSync(modsPath)) fs.mkdirSync(modsPath, { recursive: true });
            zip.extractAllTo(modsPath, true);
        }

        event.sender.send('sync-progress', { step: 'CLEANING BUFFERS...', progress: 95 });
        if (fs.existsSync(tempZip)) fs.unlinkSync(tempZip);

        event.sender.send('sync-progress', { step: 'SYNC COMPLETE!', progress: 100 });
        event.sender.send('sync-finished');
    } catch (err) {
        console.error('Sync Error Detail:', err);
        event.sender.send('sync-error', 'Matrix error: ' + err.message);
        if (fs.existsSync(tempZip)) fs.unlinkSync(tempZip);
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

const { spawn } = require('child_process');

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
        zip.extractAllTo(extractPath, true);

        const appPath = path.dirname(process.execPath);
        const batchPath = path.join(app.getPath('temp'), 'launcher-updater.bat');
        
        let sourcePath = extractPath;
        const entries = fs.readdirSync(extractPath);
        if (entries.length === 1 && fs.statSync(path.join(extractPath, entries[0])).isDirectory()) {
            sourcePath = path.join(extractPath, entries[0]);
        }

        const batchScript = `@echo off
title LosPapus Launcher Update
timeout /t 3 /nobreak > nul
xcopy /s /e /y "${sourcePath}\\*" "${appPath}\\"
start "" "${process.execPath}"
(goto) 2>nul & del "%~f0"`;

        fs.writeFileSync(batchPath, batchScript, 'utf8');
        event.sender.send('auto-update-progress', { step: '¡Listo! Reiniciando...', progress: 100 });
        
        setTimeout(() => {
            spawn('cmd.exe', ['/c', batchPath], { detached: true, stdio: 'ignore' }).unref();
            app.quit();
        }, 1500);

    } catch (err) {
        console.error('AUTO-UPDATE Error:', err);
        event.sender.send('auto-update-error', err.message);
    }
});


ipcMain.on('fetch-news', async (event) => {
    // Try local file first (always bundled with the app)
    try {
        if (fs.existsSync(NEWS_PATH)) {
            const data = JSON.parse(fs.readFileSync(NEWS_PATH, 'utf8'));
            console.log('News loaded from local file.');
            event.sender.send('news-loaded', data);
            return;
        }
    } catch (e) {
        console.warn('Local news file read failed:', e.message);
    }

    // Fallback welcome message
    event.sender.send('news-loaded', {
        title: 'LosPapus Launcher',
        posts: [
            { date: '18/03/2026', tag: 'WELCOME', text: '¡Bienvenidos al launcher! Todo listo para jugar con tus amigos.' }
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