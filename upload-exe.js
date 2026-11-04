const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const axios = require('axios');

const { version } = require('./package.json');
const token = process.env.GITHUB_TOKEN;
const [owner, repo, ...extra] = (process.env.GITHUB_REPO || '').split('/');
const tag = `v${version}`;
const dist = path.join(__dirname, 'dist');
const files = [
    { name: `LosPapus-v${version}.zip`, path: path.join(dist, `LosPapus-v${version}.zip`) },
    { name: `LosPapus-Launcher-Setup-v${version}.exe`, path: path.join(dist, `LosPapus Launcher Setup ${version}.exe`) }
];

async function uploadReleaseAssets() {
    if (!token || !owner || !repo || extra.length || !/^[\w.-]+$/.test(owner) || !/^[\w.-]+$/.test(repo)) {
        throw new Error('Define GITHUB_TOKEN y GITHUB_REPO (owner/repo) en el entorno.');
    }
    for (const file of files) {
        if (!fs.existsSync(file.path)) throw new Error(`No se encuentra el artefacto: ${file.path}. Ejecuta npm run build.`);
    }

    const headers = { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' };
    const api = `https://api.github.com/repos/${owner}/${repo}`;
    const { data: release } = await axios.get(`${api}/releases/tags/${tag}`, { headers });
    for (const file of files) {
        if (release.assets.some(asset => asset.name === file.name)) throw new Error(`El release ya tiene el asset ${file.name}; no se sobrescribió.`);
        const contents = fs.readFileSync(file.path);
        if (file.name.endsWith('.zip')) console.log(`SHA-256 ${file.name}: ${crypto.createHash('sha256').update(contents).digest('hex')}`);
        const uploadUrl = new URL(release.upload_url.replace('{?name,label}', ''));
        uploadUrl.searchParams.set('name', file.name);
        await axios.post(uploadUrl.toString(), contents, {
            headers: { ...headers, 'Content-Type': 'application/octet-stream', 'Content-Length': contents.length },
            maxContentLength: Infinity,
            maxBodyLength: Infinity
        });
        console.log(`Subido: ${file.name}`);
    }
}

uploadReleaseAssets().catch(error => {
    console.error('Falló la publicación de assets:', error.response?.data || error.message);
    process.exitCode = 1;
});
