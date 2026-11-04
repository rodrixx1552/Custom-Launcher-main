const fs = require('fs');
const path = require('path');
const axios = require('axios');
const crypto = require('crypto');

function getFileSha256(filePath) {
    return new Promise((resolve, reject) => {
        const hash = crypto.createHash('sha256');
        const stream = fs.createReadStream(filePath);
        stream.on('data', chunk => hash.update(chunk));
        stream.on('error', reject);
        stream.on('end', () => resolve(hash.digest('hex')));
    });
}

function init(ipcMain, app, context) {
    const MODS_MANIFEST_URL = 'https://raw.githubusercontent.com/rodrixx1552/Custom-Launcher-main/main/src/mods.json';
    const MODS_BASE_URL = 'https://raw.githubusercontent.com/rodrixx1552/Custom-Launcher-main/main/mods/';
    const { gameLauncher } = context;

    ipcMain.on('sync-modpacks', async (event) => {
        const modsPath = path.join(app.getPath('appData'), '.lospapus-minecraft', 'mods');

        try {
            event.sender.send('sync-progress', { step: 'SCANNING CLOUD...', progress: 5 });
            console.log('OTA Mods: Fetching manifest from:', MODS_MANIFEST_URL);
            const response = await axios.get(`${MODS_MANIFEST_URL}?t=${Date.now()}`, { timeout: 10000, maxContentLength: 100000 });
            const modsToList = response.data;

            if (Array.isArray(modsToList)) {
                if (!modsToList.every(mod => mod && typeof mod.name === 'string' && /^[\w .()\-]+\.jar$/i.test(mod.name) && /^[a-f0-9]{64}$/i.test(mod.sha256 || ''))) throw new Error('Manifiesto de mods inválido: cada mod debe tener nombre seguro y SHA-256.');
                console.log(`OTA Mods: Manifest found with ${modsToList.length} mods.`);
                if (!fs.existsSync(modsPath)) fs.mkdirSync(modsPath, { recursive: true });

                // Preserve locally installed mods; only managed manifest entries are updated.
                for (let i = 0; i < modsToList.length; i++) {
                    const mod = modsToList[i];
                    const dest = path.join(modsPath, mod.name);
                    const disabledDest = `${dest}.disable`;
                    const localDest = fs.existsSync(dest) ? dest : fs.existsSync(disabledDest) ? disabledDest : null;
                    const progress = 20 + Math.floor((i / modsToList.length) * 75);
                    let needsDownload = !localDest;
                    if (localDest) needsDownload = (await getFileSha256(localDest)).toLowerCase() !== mod.sha256.toLowerCase();
                    if (needsDownload) {
                        event.sender.send('sync-progress', { step: `DOWNLOADING: ${mod.name}`, progress });
                        console.log('OTA Mods: Downloading missing mod:', mod.name);
                        const temp = `${dest}.download`;
                        try {
                            await gameLauncher.downloadFile(MODS_BASE_URL + encodeURIComponent(mod.name), temp);
                            if (!fs.existsSync(temp) || fs.statSync(temp).size < 4) throw new Error('Archivo de mod vacío o incompleto.');
                            if ((await getFileSha256(temp)).toLowerCase() !== mod.sha256.toLowerCase()) throw new Error(`Hash inválido para ${mod.name}`);
                            fs.renameSync(temp, localDest || dest);
                        } catch (err) { if (fs.existsSync(temp)) fs.unlinkSync(temp); throw err; }
                    }
                }

                event.sender.send('sync-progress', { step: 'SYNC COMPLETE!', progress: 100 });
                event.sender.send('sync-finished');
                return;
            } else throw new Error('El manifiesto de mods no es una lista.');
        } catch (err) {
            console.error('Mods sync aborted safely:', err);
            event.sender.send('sync-error', 'No se pudo sincronizar mods: ' + err.message);
        }
    });

    ipcMain.handle('check-mods-status', async () => {
        try {
            const modsPath = path.join(app.getPath('appData'), '.lospapus-minecraft', 'mods');
            if (!fs.existsSync(modsPath)) return true;

            const response = await axios.get(`${MODS_MANIFEST_URL}?t=${Date.now()}`, { timeout: 5000, maxContentLength: 100000 });
            const remoteMods = response.data;
            if (!Array.isArray(remoteMods)) return false;

            if (Array.isArray(remoteMods)) {
                const localFiles = fs.readdirSync(modsPath).filter(f => f.endsWith('.jar') || f.endsWith('.jar.disable'));
                for (const mod of remoteMods) {
                    if (!mod || !/^[\w .()\-]+\.jar$/i.test(mod.name || '') || !/^[a-f0-9]{64}$/i.test(mod.sha256 || '')) return true;
                    const file = localFiles.includes(mod.name) ? mod.name : localFiles.includes(`${mod.name}.disable`) ? `${mod.name}.disable` : null;
                    if (!file || (await getFileSha256(path.join(modsPath, file))).toLowerCase() !== mod.sha256.toLowerCase()) return true;
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

            const files = fs.readdirSync(modsPath).filter(f => /^[\w .()\-]+\.jar(?:\.disable)?$/i.test(f));
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
            if (typeof filename !== 'string' || !/^[\w .()\-]+\.jar(?:\.disable)?$/i.test(filename)) throw new Error('Nombre de mod inválido.');
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
