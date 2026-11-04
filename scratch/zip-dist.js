
const AdmZip = require('adm-zip');
const path = require('path');
const fs = require('fs');
const version = require('../package.json').version;

async function createZip() {
    console.log('📦 Creando ZIP de la versión portable...');
    const zip = new AdmZip();
    const unpackedDir = path.join(process.cwd(), 'dist', 'win-unpacked');
    
    if (!fs.existsSync(unpackedDir)) {
        console.error('❌ No se encontró la carpeta win-unpacked en: ' + unpackedDir);
        process.exit(1);
    }
    
    zip.addLocalFolder(unpackedDir);
    zip.writeZip(path.join(process.cwd(), 'dist', `LosPapus-v${version}.zip`));
    console.log('✅ ZIP creado con éxito!');
}

createZip();
