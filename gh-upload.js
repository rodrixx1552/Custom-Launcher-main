const axios = require('axios');
const fs = require('fs');
const path = require('path');

const TOKEN = "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";
const REPO = "rodrixx1552/Custom-Launcher-main";
const BRANCH = "main";

const api = axios.create({
    baseURL: `https://api.github.com/repos/${REPO}`,
    headers: {
        Authorization: `token ${TOKEN}`,
        Accept: 'application/vnd.github.v3+json'
    }
});

async function uploadFile(localPath, remoteRepoPath, message = "Update file from AI") {
    try {
        const fullLocalPath = path.resolve(localPath);
        if (!fs.existsSync(fullLocalPath)) return console.error('SKIPPING: Local file not found:', localPath);
        
        const content = fs.readFileSync(fullLocalPath);
        const base64Content = content.toString('base64');

        // Check if file exists to get SHA
        let sha;
        try {
            const { data } = await api.get(`/contents/${remoteRepoPath}?ref=${BRANCH}`);
            sha = data.sha;
        } catch (e) { /* File doesn't exist yet */ }

        await api.put(`/contents/${remoteRepoPath}`, {
            message,
            content: base64Content,
            sha,
            branch: BRANCH
        });
        console.log('--- SUCCESS: Uploaded', remoteRepoPath);
    } catch (e) {
        console.error('--- ERROR UPLOADING', remoteRepoPath, ':', e.response ? JSON.stringify(e.response.data) : e.message);
    }
}

async function run() {
    console.log('--- GH AUTOMATOR: STARTING SYNC ---');

    console.log('1. Uploading CORE files...');
    await uploadFile('src/main.js', 'src/main.js', 'Core: OTA & News system update');
    await uploadFile('src/js/scripts/appCore.js', 'src/js/scripts/appCore.js', 'UI: OTA Banner implemented');
    await uploadFile('package.json', 'package.json', 'Build: Bump version 0.1.9 (NSIS)');
    await uploadFile('src/launcher-news.json', 'src/launcher-news.json', 'Content: Remote news feed activation');
    await uploadFile('src/launcher-config.json', 'src/launcher-config.json', 'Config: Pointing to new NSIS installer');
    await uploadFile('src/mods.json', 'src/mods.json', 'Manifest: Sync with local mods');

    console.log('\n2. Uploading MODS (Incremental)...');
    const localModsDir = path.join(__dirname, 'mods');
    if (fs.existsSync(localModsDir)) {
        const files = fs.readdirSync(localModsDir).filter(f => f.endsWith('.jar'));
        for (const file of files) {
            await uploadFile(path.join(localModsDir, file), `mods/${file}`, `Mod: Adding ${file}`);
        }
    }

    console.log('\n--- SYNC COMPLETE! ---');
    console.log('Check your repo at: https://github.com/rodrixx1552/Custom-Launcher-main');
}

run();
