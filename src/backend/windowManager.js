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
        try {
            const parsed = new URL(targetUrl);
            if (parsed.protocol !== 'https:' || !['github.com', 'discord.gg', 'discord.com', 'instagram.com', 'twitter.com', 'x.com', 'youtube.com', 'www.youtube.com', 'tiktok.com', 't.me', 'aternos.org', 'mc-heads.net'].includes(parsed.hostname)) return;
            shell.openExternal(parsed.toString());
        } catch (_) { /* Ignore malformed or non-HTTPS destinations. */ }
    });

    ipcMain.on('log-ui-error', (event, err) => {
        console.log('\x1b[31m[UI-CLIENT-ERROR]\x1b[0m', err);
    });
}

module.exports = { init };
