const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');
const { registerIpcHandlers } = require('./main/ipc');
const { flushModInfoCache } = require('./main/modInfo');
const { registerIconScheme, registerIconProtocol } = require('./main/icons');
const { scheduleIconCacheCleanup } = require('./main/iconCleanup');

registerIconScheme();

function getIconPath() {
    if (!app.isPackaged) {
        return path.join(app.getAppPath(), 'src', 'assets', 'icon.ico');
    }

    return path.join(process.resourcesPath, 'assets', 'icon.ico');
}

function createWindow() {
    const iconPath = getIconPath();

    const mainWindow = new BrowserWindow({
        width: 1500,
        height: 1200,
        icon: fs.existsSync(iconPath) ? iconPath : undefined,
        webPreferences: {
            preload: MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY
        }
    });

    mainWindow.setMenu(null);
    mainWindow.loadURL(MAIN_WINDOW_WEBPACK_ENTRY);
}

app.whenReady().then(() => {
    registerIconProtocol();
    registerIpcHandlers();
    createWindow();
    scheduleIconCacheCleanup();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('will-quit', () => {
    flushModInfoCache();
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});
