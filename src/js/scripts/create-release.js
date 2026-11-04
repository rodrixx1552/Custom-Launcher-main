const axios = require('axios');
const TOKEN = process.env.GITHUB_TOKEN;
const repository = (process.env.GITHUB_REPO || '').split('/');
const [OWNER, REPO] = repository;
const TAG = process.env.GITHUB_TAG || `v${require('../../../package.json').version}`;

async function createRelease() {
    try {
        if (!TOKEN || !OWNER || !REPO || repository.length !== 2) throw new Error('Define GITHUB_TOKEN y GITHUB_REPO (owner/repo) en el entorno.');
        console.log(`🚀 Creando release ${TAG} en ${OWNER}/${REPO}...`);
        const { data } = await axios.post(
            `https://api.github.com/repos/${OWNER}/${REPO}/releases`,
            {
                tag_name: TAG,
                name: `LosPapus Launcher ${TAG}`,
                body: `## LosPapus Launcher ${TAG}\n\n- Cliente fijo para Minecraft 1.21.1, NeoForge 21.1.265 y Java 21.\n- Sesiones Microsoft guardadas con cifrado del sistema.\n- Actualizaciones OTA verificadas con SHA-256.\n\nSube el ZIP portable y el instalador después de crear el borrador.`,
                draft: true,
                prerelease: false
            },
            { headers: { Authorization: `Bearer ${TOKEN}`, 'X-GitHub-Api-Version': '2022-11-28' } }
        );
        console.log(`✅ Release creado con éxito: ${data.html_url}`);
    } catch (err) {
        if (err.response && err.response.data && err.response.data.errors && err.response.data.errors[0].code === 'already_exists') {
            console.warn(`ℹ️ El release ${TAG} ya existe. Continuando...`);
        } else {
            console.error('❌ Error creando release:', err.response ? err.response.data : err.message);
        }
    }
}

createRelease();
