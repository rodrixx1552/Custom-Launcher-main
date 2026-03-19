const fs = require('fs');
const path = require('path');

// =====================================================================
// CONFIGURACIÓN: Cambia esta ruta por tu carpeta de mods de Minecraft
// =====================================================================
const MODS_FOLDER = path.join(__dirname, 'mods');
const OUTPUT_FILE = path.join(__dirname, 'src', 'mods.json');

console.log('--- GENERADOR DE MANIFIESTO DE MODS ---');
console.log('Escaneando mods en:', MODS_FOLDER);

if (!fs.existsSync(MODS_FOLDER)) {
    console.error('ERROR: No se encontró la carpeta de mods. Verifica la ruta en el script.');
    process.exit(1);
}

const files = fs.readdirSync(MODS_FOLDER).filter(f => f.endsWith('.jar'));
const manifest = files.map(file => {
    const stats = fs.statSync(path.join(MODS_FOLDER, file));
    const sizeMB = (stats.size / (1024 * 1024)).toFixed(2) + ' MB';
    return { name: file, size: sizeMB };
});

if (!fs.existsSync(path.join(__dirname, 'src'))) fs.mkdirSync(path.join(__dirname, 'src'), { recursive: true });

fs.writeFileSync(OUTPUT_FILE, JSON.stringify(manifest, null, 4), 'utf8');

console.log('¡ÉXITO! Se han detectado', manifest.length, 'mods.');
console.log('Archivo generado en:', OUTPUT_FILE);
console.log('\n--- PASOS SIGUIENTES ---');
console.log('1. Sube todos los archivos .jar de tu carpeta de mods a GitHub (carpeta "mods").');
console.log('2. Sube este nuevo archivo "src/mods.json" a GitHub.');
console.log('3. ¡Listo! El launcher ahora descargará solo lo necesario.');
