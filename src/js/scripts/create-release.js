const axios = require('axios');
require('dotenv').config();

const TOKEN = process.env.GITHUB_TOKEN;
const [OWNER, REPO] = process.env.GITHUB_REPO.split('/');
const TAG = 'v0.5.6';

async function createRelease() {
    try {
        console.log(`🚀 Creando release ${TAG} en ${OWNER}/${REPO}...`);
        const { data } = await axios.post(
            `https://api.github.com/repos/${OWNER}/${REPO}/releases`,
            {
                tag_name: TAG,
                name: `LosPapus Launcher ${TAG}`,
                body: `## Novedades en la v0.5.6 — ¡Absolute Automation! 🚀\n\n- **Actualización 100% Automática**: Ahora el launcher descarga, extrae y se reinicia solo. ¡Olvídate de descargas manuales!\n- **Barra de Progreso Real**: Visualiza el estado de la descarga del parche directamente en el launcher.\n- **UI Buttons Fix**: Consolidación definitiva de la reparación de los botones de JARVIS y Notificaciones.`,
                draft: false,
                prerelease: false
            },
            { headers: { Authorization: `token ${TOKEN}` } }
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
