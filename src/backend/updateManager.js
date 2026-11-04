const fs = require('fs');
const path = require('path');
const axios = require('axios');
const crypto = require('crypto');
const AdmZip = require('adm-zip');

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
        if (res.data && typeof res.data === 'object' && !Array.isArray(res.data)) {
            const config = { ...res.data, minecraft_version: '1.21.1', modloader: 'neoforge', neoforge_version: '21.1.265' };
            return config;
        }
    } catch (e) {
        console.warn('OTA config fetch error:', e.message);
    }
    return null;
}

function init(ipcMain, app, __rootDir) {
    CONFIG_PATH = path.join(__rootDir, 'launcher-config.json');
    const UPDATER_SCRIPT = path.join(app.getPath('userData'), 'LosPapus-Updater.ps1');
    let updateInProgress = false;

    async function ensureUpdaterExists() {
        if (process.platform !== 'win32') return;
        const script = `param([int]$LauncherPid,[string]$Source,[string]$Destination,[string]$Executable)
$ErrorActionPreference = 'Stop'
try {
  for ($i = 0; $i -lt 60 -and (Get-Process -Id $LauncherPid -ErrorAction SilentlyContinue); $i++) { Start-Sleep -Seconds 1 }
  $process = Get-Process -Id $LauncherPid -ErrorAction SilentlyContinue
  if ($process) { Stop-Process -Id $LauncherPid -Force }
  $copied = $false
  for ($attempt = 0; $attempt -lt 6 -and -not $copied; $attempt++) {
    try {
      Get-ChildItem -LiteralPath $Source -Force | Copy-Item -Destination $Destination -Recurse -Force
      $copied = $true
    } catch { Start-Sleep -Seconds 2 }
  }
  if (-not $copied) { throw 'No se pudieron reemplazar los archivos del launcher.' }
  Start-Process -FilePath (Join-Path $Destination $Executable)
} catch {
  Add-Type -AssemblyName System.Windows.Forms
  [System.Windows.Forms.MessageBox]::Show($_.Exception.Message, 'Error al actualizar LosPapus') | Out-Null
}`;
        fs.writeFileSync(UPDATER_SCRIPT, script, 'utf8');
    }

    async function checkForUpdates(win) {
        try {
            const config = await getRemoteConfig();
            const latestVersion = config?.latest_launcher_version || CURRENT_VERSION;
            const downloadUrl = config?.launcher_download_url || '';
            
            console.log(`[OTA Checker] Local: ${CURRENT_VERSION} | Remote: ${latestVersion}`);
            
            if (/^\d+\.\d+\.\d+$/.test(latestVersion) && isNewerVersion(latestVersion, CURRENT_VERSION) && isTrustedReleaseUrl(downloadUrl) && /^[a-f0-9]{64}$/i.test(config.launcher_sha256 || '')) {
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

        return { modloader: 'neoforge', neoforge_version: '21.1.265', minecraft_version: '1.21.1', launcher_version: CURRENT_VERSION, server: { ip: 'na34.holy.gg', port: 26068 } };
    });

    ipcMain.on('start-auto-update', async (event) => {
        if (updateInProgress) return event.sender.send('auto-update-error', 'Ya hay una actualización en curso.');
        updateInProgress = true;
        const tempZip = path.join(app.getPath('temp'), 'launcher-update.zip');
        const extractPath = path.join(app.getPath('temp'), 'launcher-update-files');

        try {
            const config = await getRemoteConfig();
            const downloadUrl = config?.launcher_download_url;
            const expectedHash = config?.launcher_sha256;
            if (!isTrustedReleaseUrl(downloadUrl) || !/^[a-f0-9]{64}$/i.test(expectedHash || '')) throw new Error('Actualización sin URL de GitHub o hash SHA-256 válido.');
            event.sender.send('auto-update-progress', { step: 'Descargando paquete...', progress: 20 });
            const response = await axios({ url: downloadUrl, method: 'GET', responseType: 'stream', timeout: 120000, maxRedirects: 5 });
            const totalLength = Number(response.headers['content-length'] || 0);
            if (totalLength > 500 * 1024 * 1024) throw new Error('El paquete de actualización supera el límite de 500 MB.');
            const writer = fs.createWriteStream(tempZip);
            let downloadedLength = 0;

            response.data.on('data', (chunk) => {
                downloadedLength += chunk.length;
                const progress = totalLength ? 20 + Math.floor((downloadedLength / totalLength) * 50) : 20;
                if (downloadedLength > 500 * 1024 * 1024) response.data.destroy(new Error('El paquete supera el límite de 500 MB.'));
                event.sender.send('auto-update-progress', { step: 'Descargando...', progress });
            });

            const hash = crypto.createHash('sha256');
            response.data.on('data', chunk => hash.update(chunk));
            response.data.pipe(writer);
            await new Promise((resolve, reject) => {
                writer.on('finish', resolve);
                writer.on('error', reject);
                response.data.on('error', reject);
            });
            if (hash.digest('hex').toLowerCase() !== expectedHash.toLowerCase()) throw new Error('El hash del paquete no coincide; se canceló la actualización.');

            event.sender.send('auto-update-progress', { step: 'Descomprimiendo parche...', progress: 80 });
            if (fs.existsSync(extractPath)) fs.rmSync(extractPath, { recursive: true, force: true });
            fs.mkdirSync(extractPath, { recursive: true });
            
            extractZipSafely(tempZip, extractPath);

            const appPath = path.dirname(process.execPath);
            let sourcePath = extractPath;
            const entries = fs.readdirSync(extractPath);
            if (entries.length === 1 && fs.statSync(path.join(extractPath, entries[0])).isDirectory()) {
                sourcePath = path.join(extractPath, entries[0]);
            }

            const exeName = path.basename(process.execPath);
            if (!fs.existsSync(path.join(sourcePath, 'resources', 'app.asar')) || !fs.existsSync(path.join(sourcePath, exeName))) {
                throw new Error('El paquete descargado está incompleto o corrupto.');
            }

            event.sender.send('auto-update-progress', { step: 'Lanzando actualizador visual...', progress: 95 });
            if (process.platform === 'win32' && fs.existsSync(UPDATER_SCRIPT)) {
                const { spawn } = require('child_process');
                const child = spawn('powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', UPDATER_SCRIPT, process.pid.toString(), sourcePath, appPath, exeName], { detached: true, stdio: 'ignore', windowsHide: true });
                child.unref();
                const quitTimer = setTimeout(() => { app.quit(); }, 500);
                child.once('error', error => {
                    clearTimeout(quitTimer);
                    event.sender.send('auto-update-error', `No se pudo iniciar el actualizador: ${error.message}`);
                });
            } else {
                event.sender.send('auto-update-error', 'No se pudo iniciar el actualizador visual.');
            }

        } catch (err) {
            try { if (fs.existsSync(tempZip)) fs.unlinkSync(tempZip); } catch (_) {}
            try { if (fs.existsSync(extractPath)) fs.rmSync(extractPath, { recursive: true, force: true }); } catch (_) {}
            event.sender.send('auto-update-error', err.message);
        } finally {
            updateInProgress = false;
        }
    });

    return { ensureUpdaterExists, getRemoteConfig, getMediafireDirectLink, checkForUpdates };
}

function isTrustedReleaseUrl(value) {
    try {
        const url = new URL(value);
        return url.protocol === 'https:' && url.hostname === 'github.com' && /^\/rodrixx1552\/Custom-Launcher-main\/releases\/download\/v\d+\.\d+\.\d+\//.test(url.pathname);
    } catch (_) { return false; }
}

function extractZipSafely(zipPath, destination) {
    const zip = new AdmZip(zipPath);
    const entries = zip.getEntries();
    if (entries.length > 10000 || entries.reduce((total, entry) => total + Number(entry.header.size || 0), 0) > 1024 * 1024 * 1024) throw new Error('El paquete de actualización excede los límites de extracción.');
    for (const entry of entries) {
        const name = entry.entryName.replace(/\\/g, '/');
        if (name.startsWith('/') || /^[a-z]:/i.test(name) || name.split('/').includes('..')) throw new Error('El archivo de actualización contiene una ruta no permitida.');
        const target = path.resolve(destination, name);
        if (!target.startsWith(path.resolve(destination) + path.sep) && target !== path.resolve(destination)) throw new Error('Ruta insegura en el paquete de actualización.');
        if (entry.isDirectory) { fs.mkdirSync(target, { recursive: true }); continue; }
        fs.mkdirSync(path.dirname(target), { recursive: true });
        fs.writeFileSync(target, entry.getData());
    }
}

module.exports = { init };
