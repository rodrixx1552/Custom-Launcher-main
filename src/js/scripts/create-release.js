const axios = require('axios');
require('dotenv').config();

const TOKEN = process.env.GITHUB_TOKEN;
const [OWNER, REPO] = process.env.GITHUB_REPO.split('/');
const TAG = 'v0.5.5';

async function createRelease() {
    try {
        console.log(`🚀 Creando release ${TAG} en ${OWNER}/${REPO}...`);
        const { data } = await axios.post(
            `https://api.github.com/repos/${OWNER}/${REPO}/releases`,
            {
                tag_name: TAG,
                name: `LosPapus Launcher ${TAG}`,
                body: `## Novedades en la v0.5.5\n\n- **Reparación de Interfaz**: Corregido el error donde los botones de JARVIS y Notificaciones no respondían visualmente.\n- **Optimización Social**: Mejorada la integración del Radar Social.\n- **Protocolos de Voz**: Ajustes menores en la latencia de las voces neuronales.\n- **OTA Activado**: El sistema de actualizaciones ahora es más robusto.`,
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
