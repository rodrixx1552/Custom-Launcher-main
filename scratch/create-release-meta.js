
const axios = require('axios');
require('dotenv').config();

async function createRelease() {
    const TOKEN = process.env.GITHUB_TOKEN;
    const [OWNER, REPO] = process.env.GITHUB_REPO.split('/');
    const TAG = 'v0.5.4';

    console.log(`🚀 Creando Release oficial ${TAG} en GitHub...`);
    
    try {
        const response = await axios.post(
            `https://api.github.com/repos/${OWNER}/${REPO}/releases`,
            {
                tag_name: TAG,
                target_commitish: 'main',
                name: TAG,
                body: '### LosPapus Launcher v0.5.4 - Update Musical y Voces TikTok\n\n- ✨ **Nuevo Player Musical**: Playlist aleatoria de Spotify, botón de saltar y pausa con fade.\n- 🎙️ **Voces de TikTok**: Jessie y el Narrador Meme integrados directamente.\n- 🛠️ **Correcciones**: Arreglo de bugs en el motor de audio y el radar.',
                draft: false,
                prerelease: false
            },
            {
                headers: {
                    Authorization: `token ${TOKEN}`,
                    Accept: 'application/vnd.github.v3+json'
                }
            }
        );

        console.log(`✅ Release creado con éxito! ID: ${response.data.id}`);
    } catch (err) {
        if (err.response && err.response.data.errors && err.response.data.errors[0].code === 'already_exists') {
            console.warn('ℹ️ El release ya existe. Continuando con la subida de archivos...');
        } else {
            console.error('❌ Error creando release:', err.response ? err.response.data : err.message);
            process.exit(1);
        }
    }
}

createRelease();
