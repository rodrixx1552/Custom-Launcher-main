const remoteMain = require('@electron/remote/main');
remoteMain.initialize();

const { app, BrowserWindow, ipcMain, screen, shell, dialog } = require("electron");
const ejse = require('ejs-electron');
const path = require("path");
const fs = require("fs");
const url = require("url");
const os = require("os");
const settings = require("./js/json/settings.json");
const ui = settings.launcher.ui;
const lang = require(`./assets/lang/${settings.launcher.ui.default_lang}.json`);

// check if the environment is dev
if (settings.launcher.debug.environment !== 'production') {
    require('electron-reload')(__dirname, {
        electron: path.join(__dirname, '../node_modules', '.bin', 'electron')
    });
}

const getSplashesText = () => {
    let data  = fs.readFileSync(path.join(__dirname, 'assets', 'splashes_texts.json'), 'utf8')
    let splashes = JSON.parse(data)
    let random = Math.floor(Math.random() * splashes.es.length)
    return splashes.es[random]
}

// Main Window
const createWindow = () => {
    const { width, height } = screen.getPrimaryDisplay().workAreaSize;

    let win = new BrowserWindow({
        width: Math.floor(width * 0.85),
        height: Math.floor(height * 0.9),
        title: ui.title,
        resizable: true,
        frame: false,
        icon: path.join(__dirname, 'assets', 'lpv_main.png'),
        webPreferences: {
            preload: path.join(__dirname, '/js/preload.js'),
            nodeIntegration: false,
            contextIsolation: true,
            enableRemoteModule: false
        }
    });

    win.webContents.session.webRequest.onHeadersReceived((details, callback) => {
        callback({
          responseHeaders: {
            ...details.responseHeaders,
            'Content-Security-Policy': [
                "default-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://fonts.gstatic.com https://raw.githubusercontent.com https://mc-heads.net; " +
                "script-src 'self' 'unsafe-inline' https://unpkg.com https://www.youtube.com https://s.ytimg.com https://raw.githubusercontent.com 'unsafe-eval'; " +
                "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://unpkg.com; " +
                "media-src 'self' data: https:; " +
                "img-src 'self' data: https: https://mc-heads.net https://mineskin.org https://i.ytimg.com https://raw.githubusercontent.com; " +
                "frame-src https://www.youtube.com; " +
                "connect-src 'self' https://raw.githubusercontent.com https://api.mcsrvstat.us https://api.mcstatus.io https://api.minecraftservices.com https://api.adoptium.net;"
            ]
          }
        })
      });

    remoteMain.enable(win.webContents);
    win.removeMenu();

    if (process.env.NODE != 'production') { win.openDevTools() }

    ejse.data('splash_text', getSplashesText());
    ejse.data('title', ui.title);
    ejse.data('srcIcon', path.join(__dirname, 'assets', ui.icon_name));
    ejse.data('bgId', path.join(__dirname, 'assets', 'los_papus', 'background.png'));
    ejse.data('helloworld', lang.frontend.buttons.test_text);
    
    win.loadURL(url.format({
        protocol: 'file:',
        pathname: path.join(__dirname, "views", 'app.ejs'),
    }));

    win.on('closed', () => { 
        win = null;
    });
    return win;
};

// ==========================================
// IMPORT BACNKEND MODULES
// ==========================================
const discordManager = require('./backend/discordManager');
const windowManager = require('./backend/windowManager');
const authManager = require('./backend/authManager');
const gameLauncher = require('./backend/gameLauncher');
const serverServices = require('./backend/serverServices');
const updateManager = require('./backend/updateManager');
const modManager = require('./backend/modManager');
const ttsManager = require('./backend/ttsManager');


// Initialize Services
discordManager.init();
windowManager.init(ipcMain);
const authContext = authManager.init(ipcMain, app);
serverServices.init(ipcMain);
ttsManager.init();

ipcMain.handle('get-total-ram', async () => {
    return Math.floor(os.totalmem() / (1024 * 1024 * 1024));
});


// Provide cross-module dependencies
const launcherContext = { discordManager, authManager: authContext };
const gameLauncherContext = gameLauncher.init(ipcMain, app, launcherContext);

const updateContext = updateManager.init(ipcMain, app, __dirname);

modManager.init(ipcMain, app, { 
    updateManager: updateContext, 
    gameLauncher: gameLauncherContext 
});

// --- READY ---
app.whenReady().then(async () => {
    await updateContext.ensureUpdaterExists();
    const mainWin = createWindow();
    updateContext.checkForUpdates(mainWin);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});