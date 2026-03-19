const axios = require('axios');
const fs = require('fs');
const path = require('path');
const AdmZip = require('adm-zip');

// Copying helper from main.js
async function getMediafireDirectLink(mediafireUrl) {
    try {
        const response = await axios.get(mediafireUrl);
        const html = response.data;
        const match = html.match(/https?:\/\/download\d+\.mediafire\.com\/[a-zA-Z0-9]+\/[a-zA-Z0-9]+\/[a-zA-Z0-9._-]+/);
        if (match) return match[0];
        const secondMatch = html.match(/href="(https?:\/\/download[^"]+)"/);
        return secondMatch ? secondMatch[1] : null;
    } catch (e) {
        console.error('Error fetching Mediafire:', e.message);
        return null;
    }
}

async function downloadFile(url, dest) {
    const response = await axios({ url, method: 'GET', responseType: 'stream' });
    const writer = fs.createWriteStream(dest);
    response.data.pipe(writer);
    return new Promise((resolve, reject) => {
        writer.on('finish', resolve);
        writer.on('error', reject);
    });
}

const MEDIAFIRE_URL = "https://www.mediafire.com/file/la1uhes3g1agnzl/mods.zip/file";
const TEMP_ZIP = path.join(__dirname, 'temp_mods.zip');
const FINAL_MODS_DIR = path.join(__dirname, 'mods');

async function migrate() {
    console.log('--- MOD MIGRATION TO GITHUB (PREP) ---');
    console.log('1. Resolving Mediafire Direct Link...');
    const directUrl = await getMediafireDirectLink(MEDIAFIRE_URL);
    if (!directUrl) {
        console.error('FAILED: Could not find direct download link.');
        return;
    }
    
    console.log('2. Downloading ZIP (this might take a while)...');
    await downloadFile(directUrl, TEMP_ZIP);
    
    console.log('3. Extracting files...');
    const zip = new AdmZip(TEMP_ZIP);
    if (!fs.existsSync(FINAL_MODS_DIR)) fs.mkdirSync(FINAL_MODS_DIR, { recursive: true });
    
    zip.extractAllTo(FINAL_MODS_DIR, true);
    console.log('4. Done! Mods extracted to:', FINAL_MODS_DIR);
    
    // Clean up
    // if (fs.existsSync(TEMP_ZIP)) fs.unlinkSync(TEMP_ZIP);
    
    console.log('\nSUCCESS! Now you just have to sync the "mods" folder to GitHub.');
}

migrate();
