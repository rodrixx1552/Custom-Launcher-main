const fs = require('fs');
const path = require('path');
const axios = require('axios');
const crypto = require('crypto');

const MODPACK_URL = 'https://raw.githubusercontent.com/rodrixx1552/Custom-Launcher-main/main/src/modpack.json';
const SAFE_JAR_NAME = /^[\w .()+-]+\.jar$/i;
const SAFE_VERSION = /^\d+\.\d+\.\d+(?:-[\w.-]+)?$/;

function getFileSha256(filePath) {
    return new Promise((resolve, reject) => {
        const hash = crypto.createHash('sha256');
        const stream = fs.createReadStream(filePath);
        stream.on('data', chunk => hash.update(chunk));
        stream.on('error', reject);
        stream.on('end', () => resolve(hash.digest('hex')));
    });
}

function validateProfile(profile) {
    if (!profile || profile.schemaVersion !== 1 || !SAFE_VERSION.test(profile.version || '')) throw new Error('Versión o esquema del modpack inválidos.');
    if (!/^\d+\.\d+(?:\.\d+)?$/.test(profile.minecraftVersion || '')) throw new Error('Versión de Minecraft inválida en el modpack.');
    if (profile.loader !== 'neoforge' || !/^\d+\.\d+\.\d+$/.test(profile.loaderVersion || '')) throw new Error('Este perfil requiere una versión válida de NeoForge.');
    if (![17, 21].includes(Number(profile.javaVersion))) throw new Error('El perfil debe usar Java 17 o Java 21.');
    if (!Array.isArray(profile.mods) || profile.mods.length > 500) throw new Error('La lista de mods no es válida.');

    const seen = new Set();
    for (const mod of profile.mods) {
        if (!mod || !SAFE_JAR_NAME.test(mod.filename || '') || seen.has(mod.filename.toLowerCase())) throw new Error('Hay un nombre de mod inválido o repetido.');
        seen.add(mod.filename.toLowerCase());
        if (!/^[a-f0-9]{64}$/i.test(mod.sha256 || '')) throw new Error(`El SHA-256 de ${mod.filename} no es válido.`);
        let download;
        try { download = new URL(mod.url); } catch (_) { throw new Error(`La URL de ${mod.filename} no es válida.`); }
        if (download.protocol !== 'https:' || download.hostname !== 'github.com' || !download.pathname.startsWith('/rodrixx1552/Custom-Launcher-main/releases/download/')) {
            throw new Error(`La descarga de ${mod.filename} debe venir de un release HTTPS del repositorio oficial.`);
        }
    }
    return profile;
}

function init(ipcMain, app) {
    const gameRoot = path.join(app.getPath('appData'), '.lospapus-minecraft');
    const modsPath = path.join(gameRoot, 'mods');
    const statePath = path.join(gameRoot, '.lospapus-modpack-state.json');

    function pruneBackups() {
        const backupRoot = path.join(gameRoot, 'mod-backups');
        if (!fs.existsSync(backupRoot)) return;
        const backups = fs.readdirSync(backupRoot)
            .map(name => ({ name, fullPath: path.join(backupRoot, name) }))
            .filter(item => fs.statSync(item.fullPath).isDirectory())
            .sort((a, b) => fs.statSync(b.fullPath).mtimeMs - fs.statSync(a.fullPath).mtimeMs);
        for (const old of backups.slice(3)) fs.rmSync(old.fullPath, { recursive: true, force: true });
    }

    async function getLatestProfile() {
        const response = await axios.get(`${MODPACK_URL}?t=${Date.now()}`, { timeout: 15000, maxContentLength: 1024 * 1024 });
        return validateProfile(response.data);
    }

    async function downloadMod(mod, destination) {
        const response = await axios.get(mod.url, { responseType: 'stream', timeout: 120000, maxRedirects: 5 });
        const writer = fs.createWriteStream(destination);
        let received = 0;
        response.data.on('data', chunk => {
            received += chunk.length;
            if (received > 1024 * 1024 * 1024) response.data.destroy(new Error(`${mod.filename} supera el límite de 1 GB.`));
        });
        response.data.pipe(writer);
        await new Promise((resolve, reject) => {
            writer.on('finish', resolve);
            writer.on('error', reject);
            response.data.on('error', reject);
        });
        if (received < 4) throw new Error(`${mod.filename} llegó vacío o incompleto.`);
        const actualHash = await getFileSha256(destination);
        if (actualHash.toLowerCase() !== mod.sha256.toLowerCase()) throw new Error(`No coincide el SHA-256 de ${mod.filename}.`);
    }

    async function syncLatestPack(onProgress = () => {}) {
        const profile = await getLatestProfile();
        fs.mkdirSync(modsPath, { recursive: true });
        const stagePath = path.join(gameRoot, `.modpack-stage-${process.pid}-${Date.now()}`);
        const backupPath = path.join(gameRoot, 'mod-backups', `${Date.now()}-${profile.version}`);
        fs.mkdirSync(stagePath, { recursive: true });

        try {
            onProgress({ step: `Preparando modpack ${profile.version}…`, progress: 3 });
            const desired = new Map(profile.mods.map(mod => [mod.filename.toLowerCase(), mod]));
            const staged = new Set();
            for (let index = 0; index < profile.mods.length; index++) {
                const mod = profile.mods[index];
                const destination = path.join(modsPath, mod.filename);
                const alreadyCurrent = fs.existsSync(destination) && (await getFileSha256(destination)).toLowerCase() === mod.sha256.toLowerCase();
                if (!alreadyCurrent) {
                    const temp = path.join(stagePath, mod.filename);
                    onProgress({ step: `Descargando ${mod.filename}`, progress: 5 + Math.floor(((index + 1) / Math.max(profile.mods.length, 1)) * 65) });
                    await downloadMod(mod, temp);
                    staged.add(mod.filename.toLowerCase());
                }
            }

            const toBackup = [];
            for (const filename of fs.readdirSync(modsPath)) {
                if (!/\.jar(?:\.disable)?$/i.test(filename)) continue;
                const baseName = filename.replace(/\.disable$/i, '');
                const requested = desired.get(baseName.toLowerCase());
                const currentPath = path.join(modsPath, filename);
                const keep = requested && filename.toLowerCase() === requested.filename.toLowerCase() &&
                    (await getFileSha256(currentPath)).toLowerCase() === requested.sha256.toLowerCase();
                if (!keep) toBackup.push({ filename, currentPath });
            }

            if (toBackup.length) fs.mkdirSync(backupPath, { recursive: true });
            const movedToBackup = [];
            const installed = [];
            try {
                for (const item of toBackup) {
                    const backupFile = path.join(backupPath, item.filename);
                    fs.renameSync(item.currentPath, backupFile);
                    movedToBackup.push({ backupFile, originalPath: item.currentPath });
                }
                for (const mod of profile.mods) {
                    if (!staged.has(mod.filename.toLowerCase())) continue;
                    const destination = path.join(modsPath, mod.filename);
                    fs.renameSync(path.join(stagePath, mod.filename), destination);
                    installed.push(destination);
                }
                const state = {
                    schemaVersion: 1,
                    version: profile.version,
                    minecraftVersion: profile.minecraftVersion,
                    loader: profile.loader,
                    loaderVersion: profile.loaderVersion,
                    javaVersion: Number(profile.javaVersion),
                    filenames: profile.mods.map(mod => mod.filename),
                    syncedAt: new Date().toISOString()
                };
                fs.writeFileSync(statePath, JSON.stringify(state, null, 2), 'utf8');
            } catch (error) {
                for (const installedPath of installed) if (fs.existsSync(installedPath)) fs.unlinkSync(installedPath);
                for (const item of movedToBackup.reverse()) if (fs.existsSync(item.backupFile)) fs.renameSync(item.backupFile, item.originalPath);
                throw error;
            }

            pruneBackups();
            onProgress({ step: `Modpack ${profile.version} listo`, progress: 100 });
            return profile;
        } finally {
            if (fs.existsSync(stagePath)) fs.rmSync(stagePath, { recursive: true, force: true });
        }
    }

    ipcMain.on('sync-modpacks', async (event) => {
        try {
            await syncLatestPack(progress => event.sender.send('sync-progress', progress));
            event.sender.send('sync-finished');
        } catch (error) {
            console.error('Modpack sync failed:', error);
            event.sender.send('sync-error', `No se pudo actualizar el modpack: ${error.message}`);
        }
    });

    ipcMain.handle('check-mods-status', async () => {
        try {
            const profile = await getLatestProfile();
            const currentState = fs.existsSync(statePath) ? JSON.parse(fs.readFileSync(statePath, 'utf8')) : null;
            if (!currentState || currentState.version !== profile.version || currentState.minecraftVersion !== profile.minecraftVersion || currentState.loaderVersion !== profile.loaderVersion || currentState.javaVersion !== Number(profile.javaVersion)) return true;
            for (const mod of profile.mods) {
                const installed = path.join(modsPath, mod.filename);
                if (!fs.existsSync(installed) || (await getFileSha256(installed)).toLowerCase() !== mod.sha256.toLowerCase()) return true;
            }
            return false;
        } catch (_) {
            return false;
        }
    });

    ipcMain.handle('get-modpack-info', async () => {
        try {
            const profile = await getLatestProfile();
            return { version: profile.version, minecraftVersion: profile.minecraftVersion, loader: profile.loader, loaderVersion: profile.loaderVersion, javaVersion: Number(profile.javaVersion), modCount: profile.mods.length };
        } catch (error) {
            return { error: error.message };
        }
    });

    const modCache = new Map();
    ipcMain.on('get-mods-list', async (event) => {
        try {
            if (!fs.existsSync(modsPath)) return event.sender.send('mods-list', []);
            const files = fs.readdirSync(modsPath).filter(filename => SAFE_JAR_NAME.test(filename.replace(/\.disable$/i, '')) && /\.jar(?:\.disable)?$/i.test(filename));
            const mods = await Promise.all(files.map(async filename => {
                const stat = fs.statSync(path.join(modsPath, filename));
                const baseName = filename.replace(/\.jar\.disable$/i, '').replace(/\.jar$/i, '');
                let details = modCache.get(baseName) || {};
                if (!modCache.has(baseName)) {
                    try {
                        const query = baseName.replace(/[-_]/g, ' ').replace(/\d+\.\d+(?:\.\d+)?/g, '').trim();
                        const response = await axios.get(`https://api.modrinth.com/v2/search?query=${encodeURIComponent(query)}&limit=1`, { timeout: 4000 });
                        const hit = response.data.hits?.[0];
                        if (hit) details = { name: hit.title, icon_url: hit.icon_url, author: hit.author, description: hit.description };
                    } catch (_) { /* Offline mod metadata is optional. */ }
                    modCache.set(baseName, details);
                }
                return {
                    filename,
                    name: details.name || baseName,
                    size: `${(stat.size / (1024 * 1024)).toFixed(2)} MB`,
                    enabled: !filename.toLowerCase().endsWith('.jar.disable'),
                    icon_url: details.icon_url || null,
                    author: details.author || 'Mod local',
                    description: details.description || 'Mod instalado en el perfil actual.'
                };
            }));
            event.sender.send('mods-list', mods);
        } catch (error) {
            console.error('Could not list local mods:', error);
            event.sender.send('mods-list', []);
        }
    });

    ipcMain.on('install-mod', (event, filePath) => {
        try {
            fs.mkdirSync(modsPath, { recursive: true });
            const fileName = path.basename(filePath || '');
            if (!SAFE_JAR_NAME.test(fileName)) throw new Error('Solo se permiten archivos .jar con nombre válido.');
            fs.copyFileSync(filePath, path.join(modsPath, fileName));
            event.sender.send('mod-installed-success', fileName);
            event.sender.send('trigger-mods-refresh');
        } catch (error) {
            event.sender.send('mod-installed-error', error.message);
        }
    });

    ipcMain.on('toggle-mod', (event, filename) => {
        try {
            if (typeof filename !== 'string' || !SAFE_JAR_NAME.test(filename.replace(/\.disable$/i, ''))) throw new Error('Nombre de mod inválido.');
            const filePath = path.join(modsPath, filename);
            if (filename.toLowerCase().endsWith('.jar.disable')) {
                const newPath = filePath.replace(/\.jar\.disable$/i, '.jar');
                fs.renameSync(filePath, newPath);
                event.sender.send('mod-toggled', { success: true, filename, newFilename: path.basename(newPath), enabled: true });
            } else if (filename.toLowerCase().endsWith('.jar')) {
                const newPath = `${filePath}.disable`;
                fs.renameSync(filePath, newPath);
                event.sender.send('mod-toggled', { success: true, filename, newFilename: path.basename(newPath), enabled: false });
            }
        } catch (error) {
            event.sender.send('mod-toggled', { success: false, error: error.message });
        }
    });

    return { getLatestProfile, syncLatestPack };
}

module.exports = { init };
