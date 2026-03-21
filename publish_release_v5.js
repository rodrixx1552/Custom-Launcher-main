const fs = require('fs');
const axios = require('axios');
const path = require('path');

const TOKEN = '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';
const REPO = 'rodrixx1552/Custom-Launcher-main';
const TAG = 'v0.2.5';
const ZIP_PATH = path.resolve('..', 'LosPapus-v0.2.5.zip');
const EXE_PATH = path.resolve('dist', 'LosPapus Launcher Setup 0.2.5.exe');

(async () => {
    try {
        console.log('Cleaning up old release if exists...');
        try {
            const existing = await axios.get(`https://api.github.com/repos/${REPO}/releases/tags/${TAG}`, {
                headers: { 'Authorization': `Bearer ${TOKEN}` }
            });
            await axios.delete(`https://api.github.com/repos/${REPO}/releases/${existing.data.id}`, {
                headers: { 'Authorization': `Bearer ${TOKEN}` }
            });
            console.log('Old release deleted.');
        } catch(e) { console.log('No existing release to delete.'); }

        console.log('Creating release v0.2.5...');
        const createRes = await axios.post(`https://api.github.com/repos/${REPO}/releases`, {
            tag_name: TAG,
            name: 'v0.2.5 - Final Fix OTA Update',
            body: '🚀 **Final Fix v0.2.5:**\n- 🐞 Arreglado bug del bucle de actualización (app.asar conflict)\n- 🎮 Discord Rich Presence "LosPapusLover" totalmente funcional\n- 🔊 Sonidos y configuración de IP dinamizada',
            draft: false,
            prerelease: false
        }, { headers: { 'Authorization': `Bearer ${TOKEN}`, 'Accept': 'application/vnd.github.v3+json' } });

        const uploadBase = createRes.data.upload_url.replace(/{.*}/, '');

        console.log('Uploading ZIP...');
        const zipBuf = fs.readFileSync(ZIP_PATH);
        await axios.post(`${uploadBase}?name=LosPapus-v0.2.5.zip`, zipBuf, {
            headers: { 'Authorization': `Bearer ${TOKEN}`, 'Content-Type': 'application/zip', 'Content-Length': zipBuf.length },
            maxContentLength: Infinity, maxBodyLength: Infinity
        });
        console.log('ZIP uploaded!');

        console.log('Uploading EXE installer...');
        const exeBuf = fs.readFileSync(EXE_PATH);
        await axios.post(`${uploadBase}?name=LosPapus-Installer-v0.2.5.exe`, exeBuf, {
            headers: { 'Authorization': `Bearer ${TOKEN}`, 'Content-Type': 'application/vnd.microsoft.portable-executable', 'Content-Length': exeBuf.length },
            maxContentLength: Infinity, maxBodyLength: Infinity
        });
        console.log('EXE uploaded!');

        console.log('\n✅ Release v0.2.5 publicado exitosamente!');
    } catch (e) {
        console.error('Error:', e.response ? JSON.stringify(e.response.data, null, 2) : e.message);
    }
})();
