const axios = require('axios');
const fs = require('fs');
const path = require('path');

const TOKEN = "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";
const REPO = "rodrixx1552/Custom-Launcher-main";
const TAG = "v0.1.9";
const FILE_PATH = path.join(__dirname, 'dist', 'LosPapus Launcher Setup 0.1.9.exe');
const ASSET_NAME = "LosPapus-Launcher-Setup.exe";

const api = axios.create({
    baseURL: `https://api.github.com/repos/${REPO}`,
    headers: { Authorization: `token ${TOKEN}` }
});

async function run() {
    console.log('--- GH RELEASE: CREATING v0.1.9 ---');
    try {
        // 1. Create Release
        let releaseData;
        try {
            const { data } = await api.post('/releases', {
                tag_name: TAG,
                target_commitish: 'main',
                name: `LosPapus Launcher ${TAG}`,
                body: "### Cambios en v0.1.9\n- Sistema de actualización inteligente de mods.\n- Noticias remotas activadas.\n- Solución definitiva para el instalador en Windows.",
                draft: false,
                prerelease: false
            });
            releaseData = data;
            console.log('--- SUCCESS: Release created!');
        } catch (e) {
            if (e.response && e.response.status === 422) {
                console.log('--- INFO: Release already exists, searching for it...');
                const { data: releases } = await api.get('/releases');
                releaseData = releases.find(r => r.tag_name === TAG);
            } else throw e;
        }

        if (!releaseData) throw new Error('Could not find or create release.');

        // 2. Upload Asset
        console.log('--- GH RELEASE: UPLOADING ASSET (79MB) ---');
        const uploadUrl = releaseData.upload_url.replace('{?name,label}', `?name=${ASSET_NAME}`);
        const content = fs.readFileSync(FILE_PATH);

        const { data: asset } = await axios({
            method: 'POST',
            url: uploadUrl,
            headers: {
                Authorization: `token ${TOKEN}`,
                'Content-Type': 'application/octet-stream',
                'Content-Length': content.length
            },
            data: content,
            maxContentLength: Infinity,
            maxBodyLength: Infinity
        });

        console.log('--- SUCCESS: Asset uploaded!', asset.browser_download_url);
        console.log('\n--- EVERYTHING COMPLETE! YOUR NEW VERSION IS LIVE! ---');
    } catch (e) {
        console.error('--- ERROR:', e.response ? JSON.stringify(e.response.data) : e.message);
    }
}

run();
