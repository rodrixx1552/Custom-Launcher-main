const fs = require('fs');
const axios = require('axios');
const path = require('path');

const TOKEN = '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';
const REPO = 'rodrixx1552/Custom-Launcher-main';
const TAG = 'v0.2.4';
const ZIP_PATH = path.resolve('..', 'LosPapus-v0.2.4.zip');
const EXE_PATH = path.resolve('dist', 'LosPapus Launcher Setup 0.2.4.exe');

(async () => {
    try {
        // Delete existing release with same tag if exists
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

        console.log('Creating release v0.2.4...');
        const createRes = await axios.post(`https://api.github.com/repos/${REPO}/releases`, {
            tag_name: TAG,
            name: 'v0.2.4 - Discord Rich Presence',
            body: '✨ **Novedades v0.2.4:**\n- 🎮 Discord Rich Presence: Ahora muestra "LosPapusLover" en Discord\n- 🔊 Sonidos de interfaz arreglados\n- 🌐 IP del servidor dinámica desde config\n- 🛠️ Correcciones generales de estabilidad',
            draft: false,
            prerelease: false
        }, { headers: { 'Authorization': `Bearer ${TOKEN}`, 'Accept': 'application/vnd.github.v3+json' } });

        const uploadBase = createRes.data.upload_url.replace(/{.*}/, '');

        // Upload ZIP (for auto-updater)
        console.log('Uploading ZIP...');
        const zipBuf = fs.readFileSync(ZIP_PATH);
        await axios.post(`${uploadBase}?name=LosPapus-v0.2.4.zip`, zipBuf, {
            headers: { 'Authorization': `Bearer ${TOKEN}`, 'Content-Type': 'application/zip', 'Content-Length': zipBuf.length },
            maxContentLength: Infinity, maxBodyLength: Infinity
        });
        console.log('ZIP uploaded!');

        // Upload EXE (installer for new users)
        console.log('Uploading EXE installer...');
        const exeBuf = fs.readFileSync(EXE_PATH);
        await axios.post(`${uploadBase}?name=LosPapus-Installer-v0.2.4.exe`, exeBuf, {
            headers: { 'Authorization': `Bearer ${TOKEN}`, 'Content-Type': 'application/vnd.microsoft.portable-executable', 'Content-Length': exeBuf.length },
            maxContentLength: Infinity, maxBodyLength: Infinity
        });
        console.log('EXE uploaded!');

        console.log('\n✅ Release v0.2.4 publicado exitosamente en GitHub!');
    } catch (e) {
        console.error('Error:', e.response ? JSON.stringify(e.response.data, null, 2) : e.message);
    }
})();
