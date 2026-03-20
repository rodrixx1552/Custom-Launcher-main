const { contextBridge, ipcRenderer } = require('electron');
const settings = require('./json/settings.json');

contextBridge.exposeInMainWorld('electronAPI', {
    closeWindow: () => ipcRenderer.send('window-control', 'close'),
    minimizeWindow: () => ipcRenderer.send('window-control', 'minimize'),
    openExternal: (url) => ipcRenderer.send('open-external', url),
    launchGame: (options) => ipcRenderer.send('launch-game', options),
    onLaunchProgress: (callback) => ipcRenderer.on('launch-progress', (event, data) => callback(data)),
    onLaunchFinished: (callback) => ipcRenderer.on('launch-finished', (event, data) => callback(data)),
    onLaunchError: (callback) => ipcRenderer.on('launch-error', (event, data) => callback(data)),
    pingServer: (serverIP) => ipcRenderer.send('ping-server', serverIP),
    onPingResult: (callback) => ipcRenderer.on('ping-result', (event, data) => callback(data)),
    syncModpacks: () => ipcRenderer.send('sync-modpacks'),
    getModsList: () => ipcRenderer.send('get-mods-list'),
    onModsList: (callback) => ipcRenderer.on('mods-list', (event, data) => callback(data)),
    onSyncProgress: (callback) => ipcRenderer.on('sync-progress', (event, data) => callback(data)),
    onSyncFinished: (callback) => ipcRenderer.on('sync-finished', (event) => callback()),
    getAccounts: () => ipcRenderer.send('get-accounts'),
    loginMicrosoft: () => ipcRenderer.send('login-microsoft'),
    addOfflineAccount: (name) => ipcRenderer.send('add-offline-account', name),
    removeAccount: (uuid) => ipcRenderer.send('remove-account', uuid),
    onAccountsList: (callback) => ipcRenderer.on('accounts-list', (event, data) => callback(data)),
    onAccountsListOnce: (callback) => ipcRenderer.once('accounts-list', (event, data) => callback(data)),
    onLoginSuccess: (callback) => ipcRenderer.on('login-success', (event, data) => callback(data)),
    onLoginError: (callback) => ipcRenderer.on('login-error', (event, data) => callback(data)),
    selectFile: () => ipcRenderer.send('select-file'),
    onFileSelected: (callback) => ipcRenderer.on('file-selected', (event, data) => callback(data)),
    getSettings: () => settings,
    getTranslations: () => require('./json/lang.json'),
    uploadSkin: (data) => ipcRenderer.send('upload-skin', data),
    onSkinUploadSuccess: (callback) => ipcRenderer.on('skin-upload-success', (event) => callback()),
    onSkinUploadError: (callback) => ipcRenderer.on('skin-upload-error', (event, data) => callback(data)),
    onSyncError: (callback) => ipcRenderer.on('sync-error', (event, data) => callback(data)),
    logError: (err) => ipcRenderer.send('log-ui-error', err),
    toggleMod: (filename) => ipcRenderer.send('toggle-mod', filename),
    onModToggled: (callback) => ipcRenderer.on('mod-toggled', (event, data) => callback(data)),
    fetchNews: () => ipcRenderer.send('fetch-news'),
    onNewsLoaded: (callback) => ipcRenderer.on('news-loaded', (event, data) => callback(data)),
    onUpdateAvailable: (callback) => ipcRenderer.on('update-available', (event, data) => callback(data)),
    // OTA Auto-Update
    startAutoUpdate: (url) => ipcRenderer.send('start-auto-update', { url }),
    onAutoUpdateProgress: (callback) => ipcRenderer.on('auto-update-progress', (event, data) => callback(data)),
    onAutoUpdateError: (callback) => ipcRenderer.on('auto-update-error', (event, error) => callback(error)),
    checkModsStatus: () => ipcRenderer.invoke('check-mods-status')
});

window.addEventListener("DOMContentLoaded", () => {
    console.log('Preload script loaded');
});
