const axios = require('axios');
const mcping = require('mcping-js');
const { shell, dialog } = require('electron');
const fs = require('fs');

function init(ipcMain, authManager, launcherConfig) {
    const configuredServer = launcherConfig?.server ? `${launcherConfig.server.ip}:${launcherConfig.server.port}` : 'na34.holy.gg:26068';
    ipcMain.on('auto-start-server', (event) => {
        shell.openExternal('https://aternos.org/go/'); // Fallback or informative
    });

    ipcMain.on('ping-server', async (event, serverIP) => {
        const headers = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36' };
        let data = { online: false };
        let playersList = [];

        // Protocol 767 = 1.21.1
        const MC_VERSION_PROTOCOL = 767;

        try {
            if (serverIP !== configuredServer) throw new Error('El radar solo puede consultar el servidor configurado.');
            console.log(`📡 Sistema de Radar: Escaneando ${serverIP}...`);

            // Split IP and Port for direct ping
            const parts = serverIP.split(':');
            const host = parts[0];
            const port = parseInt(parts[1]) || 25565;

            // --- RADAR 1: mcsrvstat.us (Web API - Has cache but good MOTD) ---
            try {
                let response = await axios.get(`https://api.mcsrvstat.us/2/${serverIP}`, { headers, timeout: 4000 });
                if (response.data && response.data.online) {
                    data = response.data;
                    playersList = data.players?.list ? data.players.list.map(name => ({ name })) : [];
                }
            } catch (e) {
                console.warn("Radar 1 (Web) timeout or down.");
            }

            // --- RADAR 2 (FORCED): mcping-js (Direct TCP Ping - No Cache) ---
            // We always try this if online is false or we want real-time accuracy
            if (!data.online) {
                console.log("Activando Radar de Respaldo (Ping Directo con Timeout)...");
                const server = new mcping.MinecraftServer(host, port);

                await new Promise((resolve) => {
                    const timeoutTimer = setTimeout(() => {
                        console.warn(`📡 [Radar Directo] Timeout alcanzado para ${serverIP}. Resolviendo...`);
                        resolve();
                    }, 3500); // Forzamos resolución en 3.5s si mcping no responde

                    server.ping(3000, MC_VERSION_PROTOCOL, (err, res) => {
                        clearTimeout(timeoutTimer);
                        if (!err && res) {
                            data.online = true;
                            data.players = {
                                online: res.players?.online || 0,
                                max: res.players?.max || 20
                            };
                            playersList = res.players?.sample || [];
                            console.log("¡Radar Directo exitoso! Servidor ONLINE.");
                        } else if (err) {
                            console.warn(`📡 [Radar Directo] No se pudo conectar: ${err.message}`);
                        }
                        resolve();
                    });
                });
            }

            if (data.online) {
                event.sender.send('ping-result', {
                    online: true,
                    version: data.version?.name || '1.21.1',
                players: {
                        online: Number.isFinite(Number(data.players?.online)) ? Math.max(0, Math.floor(Number(data.players.online))) : 0,
                        max: Number.isFinite(Number(data.players?.max)) ? Math.max(1, Math.floor(Number(data.players.max))) : 20,
                        list: playersLis
                    },
                    description: data.motd?.clean?.[0] || 'Los Papus Lover Server'
                });
            } else {
                event.sender.send('ping-result', { online: false });
            }
        } catch (err) {
            console.warn(`Error en Ping System para ${serverIP}:`, err.message);
            event.sender.send('ping-result', { online: false });
        }
    });

    ipcMain.on('upload-skin', async (event, { uuid, base64Image }) => {
        try {
            const accessToken = authManager.getAccessToken(uuid);
            if (!accessToken) throw new Error('Vuelve a iniciar sesión con tu cuenta Microsoft.');
            if (typeof base64Image !== 'string' || !base64Image.startsWith('data:image/png;base64,') || base64Image.length > 8_000_000) throw new Error('Imagen PNG inválida o demasiado grande.');
            const buffer = Buffer.from(base64Image.split(',')[1], 'base64');
            const image = await require('jimp').read(buffer);
            if (![64, 128, 256, 512, 1024].includes(image.bitmap.width) || ![32, 64, 128, 256, 512, 1024].includes(image.bitmap.height)) throw new Error('La skin debe tener dimensiones compatibles con Minecraft.');
            const formData = new (require('form-data'))();
            formData.append('variant', 'classic'); // or 'slim'
            formData.append('file', buffer, { filename: 'skin.png' });

            const response = await axios.put('https://api.minecraftservices.com/minecraft/profile/skins', formData, {
                headers: {
                    ...formData.getHeaders(),
                    'Authorization': `Bearer ${accessToken}
                }
            });

            event.sender.send('skin-upload-success');
        } catch (err) {
            console.error('Skin Upload Error:', err.response?.data || err.message);
            event.sender.send('skin-upload-error', err.response?.data?.errorMessage || 'Failed to upload skin to Mojang.');
        }
    });

    ipcMain.on('select-file', (event) => {
        dialog.showOpenDialog({
            properties: ['openFile'],
            filters: [{ name: 'Images', extensions: ['png'] }]
        }).then(result => {
            if (!result.canceled && result.filePaths.length > 0) {
                const filePath = result.filePaths[0];
                const stat = fs.statSync(filePath);
                if (stat.size > 8 * 1024 * 1024) throw new Error('La imagen supera el límite de 8 MB.');
                const buffer = fs.readFileSync(filePath);
                if (buffer.length < 8 || !buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) throw new Error('El archivo seleccionado no es un PNG válido.');
                const data = buffer.toString('base64');
                event.sender.send('file-selected', `data:image/png;base64,${data}`);
            }
        }).catch(err => {
            console.error(err);
        });
    });
}

module.exports = { init };
