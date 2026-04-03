const fs = require('fs');
const path = require('path');

const modsDir = path.join(__dirname, 'mods');
const manifestFile = path.join(__dirname, 'src', 'mods.json');

function formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

try {
    const files = fs.readdirSync(modsDir).filter(f => f.endsWith('.jar'));
    const manifest = files.map(file => {
        const stats = fs.statSync(path.join(modsDir, file));
        return {
            name: file,
            size: formatBytes(stats.size)
        };
    });

    fs.writeFileSync(manifestFile, JSON.stringify(manifest, null, 4));
    console.log(`✅ ¡Éxito! Se detectaron ${manifest.length} mods y se actualizó src/mods.json`);
} catch (err) {
    console.error('❌ Error al actualizar el manifiesto:', err.message);
}
