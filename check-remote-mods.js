const axios = require('axios');
const TOKEN = "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";
const REPO = "rodrixx1552/Custom-Launcher-main";
const api = axios.create({
    baseURL: `https://api.github.com/repos/${REPO}`,
    headers: { Authorization: `token ${TOKEN}` }
});
async function check() {
    try {
        const { data } = await api.get('/contents/mods');
        console.log('GitHub: Found', data.length, 'files in mods/');
    } catch (e) {
        console.log('GitHub ERROR:', e.response ? e.response.status : e.message);
    }
}
check();
