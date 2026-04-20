
const fs = require('fs');
const path = require('path');
const axios = require('axios');
require('dotenv').config();

const TOKEN = process.env.GITHUB_TOKEN;
const [OWNER, REPO] = process.env.GITHUB_REPO.split('/');
const TAG = 'v0.5.9';

const FILES = [
    { name: 'LosPapus-v0.5.9.zip', path: path.join(__dirname, 'dist', 'LosPapus-v0.5.9.zip') },
    { name: 'LosPapus-Launcher-Setup-v0.5.9.exe', path: path.join(__dirname, 'dist', 'LosPapus Launcher Setup 0.5.9.exe') }
];

async function upload() {
    try {
        console.log(`📡 Buscando release ${TAG}...`);
        let release;
        try {
            const res = await axios.get(
                `https://api.github.com/repos/${OWNER}/${REPO}/releases/tags/${TAG}`,
                { headers: { Authorization: `token ${TOKEN}` } }
            );
            release = res.data;
        } catch (e) {
            console.log(`⚠️ Release ${TAG} no existe. Creando...`);
            const res = await axios.post(
                `https://api.github.com/repos/${OWNER}/${REPO}/releases`,
                { tag_name: TAG, name: `Release ${TAG}`, body: "Actualización automática." },
                { headers: { Authorization: `token ${TOKEN}` } }
            );
            release = res.data;
            console.log(`✅ Release creada con ID ${release.id}`);
        }

        for (const file of FILES) {
            console.log(`📤 Subiendo ${file.name}...`);
            const fileBuffer = fs.readFileSync(file.path);
            const uploadUrl = release.upload_url.replace('{?name,label}', `?name=${file.name}`);

            try {
                await axios.post(uploadUrl, fileBuffer, {
                    headers: {
                        Authorization: `token ${TOKEN}`,
                        'Content-Type': 'application/octet-stream',
                        'Content-Length': fileBuffer.length
                    },
                    maxContentLength: Infinity,
                    maxBodyLength: Infinity
                });
                console.log(`✅ ${file.name} subido con éxito!`);
            } catch (err) {
                if (err.response && err.response.data.errors && err.response.data.errors[0].code === 'already_exists') {
                    console.warn(`ℹ️ ${file.name} ya existe. Saltando...`);
                } else {
                    console.error(`❌ Error subiendo ${file.name}:`, err.response ? err.response.data : err.message);
                }
            }
        }
    } catch (err) {
        console.error('❌ Error general:', err.response ? err.response.data : err.message);
    }
}

upload();
