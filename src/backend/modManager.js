const fs = require('fs');
const path = require('path');
const axios = require('axios');
const AdmZip = require('adm-zip');

function init(ipcMain, app, context) {
    const MODS_MANIFEST_URL = 'https://raw.githubusercontent.com/rodrixx1552/Custom-Launcher-main/main/src/mods.json';
    const MODS_BASE_URL = 'https://raw.githubusercontent.com/rodrixx1552/Custom-Launcher-main/main/mods/';
    const { updateManager, gameLauncher } = context;

    ipcMain.on('sync-modpacks', async (event) => {
        let manifestSuccess = false;
        const modsPath = path.join(app.getPath('appData'), '.lospapus-minecraft', 'mods');
        const tempZip = path.join(app.getPath('temp'), 'modpack.zip');

        try {
            event.sender.send('sync-progress', { step: 'SCANNING CLOUD...', progress: 5 });
            console.log('OTA Mods: Fetching manifest from:', MODS_MANIFEST_URL);
            const response = await axios.get(`${MODS_MANIFEST_URL}?t=${Date.now()}`, { timeout: 10000 });
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
                        await gameLauncher.downloadFile(MODS_BASE_URL + encodeURIComponent(mod.name), dest);
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
                const mediafireUrl = "https://www.mediafire.com/file/542w7o9u5z402he/MODS_LOSPAPUS.zip/file"; // Hardcoded safe fallback
                const config = await updateManager.getRemoteConfig();
                const usedUrl = config?.modpack_url || mediafireUrl;

                const directUrl = await updateManager.getMediafireDirectLink(usedUrl);
                await gameLauncher.downloadFile(directUrl, tempZip);
                const zip = new AdmZip(tempZip);
                const rootPath = path.join(app.getPath('appData'), '.lospapus-minecraft');
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
            const modsPath = path.join(app.getPath('appData'), '.lospapus-minecraft', 'mods');
            if (!fs.existsSync(modsPath)) return true;

            const response = await axios.get(`${MODS_MANIFEST_URL}?t=${Date.now()}`, { timeout: 5000 });
            const remoteMods = response.data;
            if (!Array.isArray(remoteMods)) return typeof remoteMods === 'object' && remoteMods.length > 0;

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

    const modCache = new Map();
    ipcMain.on('get-mods-list', async (event) => {
        try {
            const modsPath = path.join(app.getPath('appData'), '.lospapus-minecraft', 'mods');
            if (!fs.existsSync(modsPath)) {
                event.sender.send('mods-list', []);
                return;
            }

            const files = fs.readdirSync(modsPath).filter(f => f.endsWith('.jar') || f.endsWith('.jar.disable'));
            const mods = await Promise.all(files.map(async (filename) => {
                const fullPath = path.join(modsPath, filename);
                const stat = fs.statSync(fullPath);
                const enabled = filename.endsWith('.jar');
                const baseName = filename.replace('.jar.disable', '').replace('.jar', '');
                
                let result = {
                    filename: filename,
                    name: baseName,
                    size: (stat.size / (1024 * 1024)).toFixed(2) + ' MB',
                    enabled: enabled,
                    icon_url: null,
                    author: 'Minecraft Pilot',
                    description: 'Mod cargado directamente del sistema.'
                };

                if (modCache.has(baseName)) {
                    result = { ...result, ...modCache.get(baseName) };
                } else {
                    try {
                        const cleanQuery = baseName.replace(/[\-_]/g, ' ').replace(/\d+\.\d+(\.\d+)?/g, '').trim();
                        const res = await axios.get(`https://api.modrinth.com/v2/search?query=${encodeURIComponent(cleanQuery)}&limit=1`, { timeout: 4000 });
                        if (res.data.hits && res.data.hits.length > 0) {
                            const hit = res.data.hits[0];
                            const meta = { name: hit.title, icon_url: hit.icon_url, author: hit.author, description: hit.description };
                            modCache.set(baseName, meta);
                            result = { ...result, ...meta };
                        }
                    } catch(e) { }
                }
                return result;
            }));
            
            event.sender.send('mods-list', mods);
        } catch (e) {
            console.error('Error fetching mods:', e);
            event.sender.send('mods-list', []);
        }
    });

    ipcMain.on('install-mod', (event, filePath) => {
        try {
            const modsPath = path.join(app.getPath('appData'), '.lospapus-minecraft', 'mods');
            if (!fs.existsSync(modsPath)) fs.mkdirSync(modsPath, { recursive: true });

            const fileName = path.basename(filePath);
            if (!fileName.toLowerCase().endsWith('.jar')) {
                event.sender.send('mod-installed-error', 'Solo se permiten archivos .jar (Mods de Minecraft).');
                return;
            }

            const destPath = path.join(modsPath, fileName);
            fs.copyFileSync(filePath, destPath);
            
            console.log('Mod instalado via Drag & Drop:', fileName);
            event.sender.send('mod-installed-success', fileName);
            event.sender.send('trigger-mods-refresh');
        } catch (e) {
            console.error('Failed to install mod:', e);
            event.sender.send('mod-installed-error', e.message);
        }
    });

    ipcMain.on('toggle-mod', (event, filename) => {
        try {
            const modsPath = path.join(app.getPath('appData'), '.lospapus-minecraft', 'mods');
            const filePath = path.join(modsPath, filename);
            
            if (filename.endsWith('.jar.disable')) {
                const newPath = filePath.replace('.jar.disable', '.jar');
                fs.renameSync(filePath, newPath);
                event.sender.send('mod-toggled', { success: true, filename, newFilename: path.basename(newPath), enabled: true });
            } else if (filename.endsWith('.jar')) {
                const newPath = filePath + '.disable';
                fs.renameSync(filePath, newPath);
                event.sender.send('mod-toggled', { success: true, filename, newFilename: path.basename(newPath), enabled: false });
            }
        } catch (e) {
            console.error('Error toggling mod:', e);
            event.sender.send('mod-toggled', { success: false, error: e.message });
        }
    });
}

module.exports = { init };
