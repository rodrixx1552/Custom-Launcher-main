const axios = require('axios');
const fs = require('fs');
const path = require('path');

const TOKEN = "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";
const REPO = "rodrixx1552/Custom-Launcher-main";

const api = axios.create({
    baseURL: `https://api.github.com/repos/${REPO}`,
    headers: { Authorization: `token ${TOKEN}` }
});

async function check() {
    try {
        const { data: remoteFiles } = await api.get('/contents/mods');
        const remoteNames = remoteFiles.map(f => f.name);
        
        const localFiles = fs.readdirSync('mods').filter(f => f.endsWith('.jar'));
        
        console.log('--- MISSING MODS ON GITHUB ---');
        localFiles.forEach(f => {
            if (!remoteNames.includes(f)) {
                const stats = fs.statSync(path.join('mods', f));
                console.log(`- ${f} (${(stats.size/1024/1024).toFixed(2)} MB)`);
            }
        });
    } catch (e) {
        console.error('ERROR:', e.message);
    }
}
check();
