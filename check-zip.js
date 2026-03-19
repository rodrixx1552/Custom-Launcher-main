const AdmZip = require('adm-zip');
const path = require('path');
const zipPath = path.join(process.env.APPDATA, '.lospapuslover', 'mods', 'lospapuslover-mods.zip');
try {
    const zip = new AdmZip(zipPath);
    const entries = zip.getEntries();
    console.log('--- ZIP ENTRIES ---');
    entries.forEach(e => console.log(e.entryName));
} catch (e) {
    console.error('ERROR:', e.message);
}
