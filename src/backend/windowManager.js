const { BrowserWindow, shell } = require('electron');

function init(ipcMain) {
    ipcMain.on('window-control', (event, action) => {
        const win = BrowserWindow.fromWebContents(event.sender);
        if (win) {
            if (action === 'close') win.close();
            if (action === 'minimize') win.minimize();
            if (action === 'maximize') {
                if (win.isMaximized()) win.unmaximize();
                else win.maximize();
            }
        }
    });

    ipcMain.on('open-external', (event, targetUrl) => {
        shell.openExternal(targetUrl);
    });

    ipcMain.on('log-ui-error', (event, err) => {
        console.log('\x1b[31m[UI-CLIENT-ERROR]\x1b[0m', err);
    });
}

module.exports = { init };
