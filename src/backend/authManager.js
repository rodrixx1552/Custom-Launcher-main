const fs = require('fs');
const path = require('path');
const msmc = require('msmc');
const { BrowserWindow } = require('electron');

let authManager = null;
try {
    const Auth = msmc.Auth || msmc.default?.Auth || msmc.default;
    if (typeof Auth === 'function') {
        authManager = new Auth("select_account");
        console.log('MSMC Auth Manager initialized successfully (Auth Class).');
    } else if (msmc.fastLaunch) {
        authManager = msmc;
        console.log('MSMC detected as fastLaunch-capable object.');
    }
} catch (e) {
    console.error('CRITICAL: Failed to initialize msmc Auth:', e.message);
}

function init(ipcMain, app) {
    const accountsPath = path.join(app.getPath('userData'), 'accounts.json');

    function saveAccounts(accounts) {
        fs.writeFileSync(accountsPath, JSON.stringify(accounts, null, 2));
    }

    function getAccounts() {
        if (!fs.existsSync(accountsPath)) return [];
        try {
            return JSON.parse(fs.readFileSync(accountsPath, 'utf8'));
        } catch (e) {
            return [];
        }
    }

    ipcMain.on('get-accounts', (event) => {
        event.sender.send('accounts-list', getAccounts());
    });

    ipcMain.on('add-offline-account', (event, name) => {
        console.log('IPC: add-offline-account triggered for:', name);
        try {
            const crypto = require('crypto');
            const hash = crypto.createHash('md5').update('OfflinePlayer:' + name).digest('hex');
            const uuid = `${hash.substring(0,8)}-${hash.substring(8,12)}-${hash.substring(12,16)}-${hash.substring(16,20)}-${hash.substring(20,32)}`;

            let accounts = getAccounts();
            accounts = accounts.filter(a => a.name.toLowerCase() !== name.toLowerCase());

            const newAccount = { uuid, name, type: 'offline', addedAt: new Date().toISOString() };
            accounts.push(newAccount);
            saveAccounts(accounts);

            console.log('Offline account added:', name, 'UUID:', uuid);
            event.sender.send('login-success', newAccount);
            event.sender.send('accounts-list', accounts);
        } catch (e) {
            console.error('Error adding offline account:', e);
            event.sender.send('login-error', e.message);
        }
    });

    ipcMain.on('remove-account', (event, uuid) => {
        console.log('IPC: remove-account triggered for:', uuid);
        try {
            let accounts = getAccounts();
            accounts = accounts.filter(a => a.uuid !== uuid);
            saveAccounts(accounts);
            event.sender.send('accounts-list', accounts);
        } catch (e) {
            console.error('Error removing account:', e);
        }
    });

    ipcMain.on('login-microsoft', async (event) => {
        console.log('IPC: login-microsoft triggered');
        try {
            if (!authManager) {
                 throw new Error("Auth system failed to initialize. Re-attempting manual setup...");
            }

            console.log('MSMC: Launching manual browser window (STABILITY MODE)...');
            
             const xboxManagerResult = await new Promise((resolve, reject) => {
                const loginWindow = new BrowserWindow({
                    width: 500,
                    height: 650,
                    resizable: false,
                    title: 'Microsoft Login',
                    alwaysOnTop: true,
                    webPreferences: {
                        nodeIntegration: false,
                        contextIsolation: true,
                        partition: 'session_msmc_' + Date.now()
                    }
                });

                const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';
                
                loginWindow.setMenu(null);
                
                let loginUrl;
                try {
                    loginUrl = (typeof authManager?.createLink === 'function') ? authManager.createLink() : 
                               (typeof authManager?.getAuthUrl === 'function' ? authManager.getAuthUrl() : "https://login.live.com/oauth20_authorize.srf");
                } catch(e) {
                    loginUrl = "https://login.live.com/oauth20_authorize.srf"; 
                }

                loginWindow.loadURL(loginUrl, { userAgent });

                let processed = false;
                const handleRedirect = async (url) => {
                    if (processed || !url.includes("code=")) return;
                    processed = true;
                    console.log('MSMC: Code captured. Processing login...');
                    
                    try {
                        let code;
                        if (typeof authManager?.getCode === 'function') {
                            code = authManager.getCode(url);
                        } else {
                            const params = new URL(url).searchParams;
                            code = params.get('code');
                        }
                        
                        if (!code) throw new Error("No se pudo extraer el código de Microsoft.");
                        
                        const result = await (authManager.login ? authManager.login(code) : authManager.authenticate(code));
                        loginWindow.removeAllListeners('closed');
                        loginWindow.close();
                        resolve(result);
                    } catch (e) {
                        console.error('MSMC Login Error handler:', e);
                        processed = false; 
                        reject(e);
                    }
                };

                loginWindow.on('closed', () => { if (!processed) reject(new Error("error.gui.closed")); });
                loginWindow.webContents.on('will-redirect', (event, url) => handleRedirect(url));
                loginWindow.webContents.on('did-get-redirect-request', (event, oldUrl, newUrl) => handleRedirect(newUrl));
                loginWindow.webContents.on('will-navigate', (event, url) => handleRedirect(url));
            });

            console.log('MSMC: Auth successful, fetching Minecraft profile...');
            let mcToken;
            try {
                if (typeof xboxManagerResult.getMinecraft === 'function') {
                    mcToken = await xboxManagerResult.getMinecraft();
                } else if (xboxManagerResult.mcToken) {
                    mcToken = xboxManagerResult.mcToken;
                } else {
                    mcToken = xboxManagerResult;
                }
            } catch(mcErr) {
                console.error('MSMC getMinecraft Error:', mcErr);
                throw new Error("No se pudo obtener el token de Minecraft. Revisa tu cuenta.");
            }
            
            if (!mcToken || (!mcToken.profile && !mcToken.name)) {
                throw new Error("No se encontró un perfil de Minecraft en esta cuenta.");
            }

            const account = {
                name: mcToken.profile?.name || mcToken.name,
                uuid: mcToken.profile?.id || mcToken.uuid,
                access_token: mcToken.access_token,
                type: 'microsoft',
                meta: mcToken.profile || mcToken
            };

            let accounts = getAccounts();
            accounts = accounts.filter(a => a.uuid !== account.uuid);
            accounts.push(account);
            saveAccounts(accounts);

            console.log('MSMC: Login success for', account.name);
            event.sender.send('login-success', account);
        } catch (err) {
            console.error('--- MSMC FULL ERROR ---');
            console.error(err);
            
            let errorMsg = 'Error occurred during Microsoft login.';
            
            if (typeof err === 'string') errorMsg = err;
            else if (err.message) errorMsg = err.message;

            if (errorMsg.includes('error.gui.closed')) {
                errorMsg = 'La ventana de login fue cerrada antes de terminar.';
            } else if (errorMsg.includes('ERR_CONNECTION_REFUSED') || errorMsg.includes('timeout')) {
                errorMsg = 'Error de conexión. Revisa tu internet o la hora de tu PC.';
            } else if (errorMsg.includes('profile') || errorMsg.includes('404')) {
                errorMsg = 'No tienes un perfil de Minecraft Java creado en esta cuenta.';
            }
            
            event.sender.send('login-error', errorMsg);
        }
    });

    return { getAccountsLocal: getAccounts };
}

module.exports = { init };
