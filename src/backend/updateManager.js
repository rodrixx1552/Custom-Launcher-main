const fs = require('fs');
const path = require('path');
const axios = require('axios');

const CURRENT_VERSION = require('../../package.json').version;
const REMOTE_CONFIG_URL = 'https://raw.githubusercontent.com/rodrixx1552/Custom-Launcher-main/main/src/launcher-config.json';
let CONFIG_PATH = '';

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

async function getMediafireDirectLink(url) {
    if (!url.includes('mediafire.com')) return url;
    try {
        console.log('Resolving Mediafire Link:', url);
        const response = await axios.get(url, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36' }
        });

        const patterns = [
            /aria-label="Download file"\s+href="([^"]+)"/i,
            /href="((?:https?:\/\/)?download[^"]+\.mediafire\.com\/[^"]+)"/i,
            /window\.location\.href\s*=\s*['"](https?:\/\/[^'"]+\.mediafire\.com\/[^'"]+)['"]/i
        ];

        for (const pattern of patterns) {
            const match = response.data.match(pattern);
            if (match && match[1]) {
                console.log('Mediafire Direct Link Resolved:', match[1]);
                return match[1];
            }
        }
        
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

async function getRemoteConfig() {
    try {
        console.log('OTA: Fetching remote config from:', REMOTE_CONFIG_URL);
        const res = await axios.get(`${REMOTE_CONFIG_URL}?t=${Date.now()}`, { timeout: 8000 });
        if (res.data) {
            fs.writeFileSync(CONFIG_PATH, JSON.stringify(res.data, null, 2), 'utf8');
            return res.data;
        }
    } catch (e) {
        console.warn('OTA config fetch error:', e.message);
    }
    return null;
}

function init(ipcMain, app, __rootDir) {
    CONFIG_PATH = path.join(__rootDir, 'launcher-config.json');
    const UPDATER_SOURCE = path.join(__rootDir, 'js', 'scripts', 'LosPapusUpdater.cs');
    const UPDATER_EXE = path.join(app.getPath('userData'), 'LosPapus-Updater.exe');

    async function ensureUpdaterExists() {
        if (fs.existsSync(UPDATER_EXE)) return;

        console.log('UPDATER: Compiling Visual Updater...');
        const cscPath = 'C:\\Windows\\Microsoft.NET\\Framework64\\v4.0.30319\\csc.exe';
        
        if (!fs.existsSync(cscPath)) {
            console.error('UPDATER: C# Compiler not found. Fallback to basic mode.');
            return;
        }

        try {
            const { execSync } = require('child_process');
            const tempSourcePath = path.join(app.getPath('temp'), 'LosPapusUpdater.cs');
            const sourceCode = fs.readFileSync(UPDATER_SOURCE, 'utf8');
            fs.writeFileSync(tempSourcePath, sourceCode, 'utf8');
            
            execSync(`"${cscPath}" /out:"${UPDATER_EXE}" /target:winexe /reference:System.Windows.Forms.dll /reference:System.Drawing.dll "${tempSourcePath}"`, { windowsHide: true });
            console.log('UPDATER: Visual Updater compiled successfully at:', UPDATER_EXE);
            if (fs.existsSync(tempSourcePath)) fs.unlinkSync(tempSourcePath);
        } catch (e) {
            console.error('UPDATER: Failed to compile visual updater:', e);
        }
    }

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

    ipcMain.handle('get-server-ip', async () => {
        try {
            if (fs.existsSync(CONFIG_PATH)) {
                const localConfig = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
                if (localConfig && localConfig.server) return `${localConfig.server.ip}:${localConfig.server.port}`;
                if (localConfig && localConfig.server_ip) return localConfig.server_ip;
            }
        } catch (e) {}
        return 'na34.holy.gg:26068';
    });

    ipcMain.handle('get-launcher-config', async () => {
        try {
            if (fs.existsSync(CONFIG_PATH)) {
                const localConfig = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
                if (localConfig && Object.keys(localConfig).length > 0) return localConfig;
            }
        } catch (e) {}

        try {
            const remoteConfig = await getRemoteConfig();
            if (remoteConfig && Object.keys(remoteConfig).length > 0) return remoteConfig;
        } catch (e) {}

        return { forge_version: '47.4.17', launcher_version: '0.5.3', server: { ip: 'na34.holy.gg', port: 26068 } };
    });

    ipcMain.on('start-auto-update', async (event, { url }) => {
        console.log('AUTO-UPDATE: Initialization started for:', url);
        const tempZip = path.join(app.getPath('temp'), 'launcher-update.zip');
        const extractPath = path.join(app.getPath('temp'), 'launcher-update-files');

        try {
            event.sender.send('auto-update-progress', { step: 'Resolviendo servidor...', progress: 10 });
            let downloadUrl = url;
            if (url.includes('mediafire.com')) downloadUrl = await getMediafireDirectLink(url);

            event.sender.send('auto-update-progress', { step: 'Descargando paquete...', progress: 20 });
            const response = await axios({ url: downloadUrl, method: 'GET', responseType: 'stream' });
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
                writer.on('finish', () => setTimeout(resolve, 2500));
                writer.on('error', reject);
            });

            event.sender.send('auto-update-progress', { step: 'Descomprimiendo parche...', progress: 80 });
            if (fs.existsSync(extractPath)) fs.rmSync(extractPath, { recursive: true, force: true });
            fs.mkdirSync(extractPath, { recursive: true });
            
            try {
                const { execSync } = require('child_process');
                execSync(`tar -xf "${tempZip}" -C "${extractPath}"`, { windowsHide: true, stdio: 'ignore' });
            } catch (e) {
                event.sender.send('auto-update-error', 'Falló la descompresión nativa del parche OTA.');
                return;
            }

            const appPath = path.dirname(process.execPath);
            let sourcePath = extractPath;
            const entries = fs.readdirSync(extractPath);
            if (entries.length === 1 && fs.statSync(path.join(extractPath, entries[0])).isDirectory()) {
                sourcePath = path.join(extractPath, entries[0]);
            }

            const exeName = path.basename(process.execPath);
            if (!fs.existsSync(path.join(sourcePath, 'resources', 'app.asar')) || !fs.existsSync(path.join(sourcePath, exeName))) {
                event.sender.send('auto-update-error', `El servidor envió un parche incompleto o corrupto.`);
                return;
            }

            event.sender.send('auto-update-progress', { step: 'Lanzando actualizador visual...', progress: 95 });
            const tempLogo = path.join(app.getPath('temp'), 'update-logo.png');
            try { fs.copyFileSync(path.join(__rootDir, 'assets', 'los_papus', 'logo.png'), tempLogo); } catch(e) {}

            if (fs.existsSync(UPDATER_EXE)) {
                const { spawn } = require('child_process');
                const child = spawn(UPDATER_EXE, [ process.pid.toString(), sourcePath, appPath, exeName, tempLogo ], { detached: true, stdio: 'ignore', windowsHide: false });
                child.unref();
                setTimeout(() => { app.quit(); }, 500);
            } else {
                event.sender.send('auto-update-error', 'No se pudo iniciar el actualizador visual.');
            }

        } catch (err) {
            event.sender.send('auto-update-error', err.message);
        }
    });

    return { ensureUpdaterExists, getRemoteConfig, getMediafireDirectLink, checkForUpdates };
}

module.exports = { init };
