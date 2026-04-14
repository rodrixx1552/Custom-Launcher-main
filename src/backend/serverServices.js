const axios = require('axios');
const mcping = require('mcping-js');
const { shell, dialog } = require('electron');
const fs = require('fs');

function init(ipcMain) {
    ipcMain.on('auto-start-server', (event) => {
        shell.openExternal('https://aternos.org/go/'); // Fallback or informative
    });

    ipcMain.on('ping-server', async (event, serverIP) => {
        const headers = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36' };
        let data = { online: false };
        let playersList = [];

        // Protocol 763 = 1.20.1
        const MC_VERSION_PROTOCOL = 763;

        try {
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
                    version: data.version?.name || '1.20.1', 
                    players: {
                        online: data.players?.online || 0,
                        max: data.players?.max || 20,
                        list: playersList
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

    ipcMain.on('upload-skin', async (event, { accessToken, base64Image }) => {
        try {
            const buffer = Buffer.from(base64Image.split(',')[1], 'base64');
            const formData = new (require('form-data'))();
            formData.append('variant', 'classic'); // or 'slim'
            formData.append('file', buffer, { filename: 'skin.png' });

            const response = await axios.put('https://api.minecraftservices.com/minecraft/profile/skins', formData, {
                headers: {
                    ...formData.getHeaders(),
                    'Authorization': `Bearer ${accessToken}`
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
                const data = fs.readFileSync(filePath).toString('base64');
                event.sender.send('file-selected', `data:image/png;base64,${data}`);
            }
        }).catch(err => {
            console.error(err);
        });
    });
}

module.exports = { init };
