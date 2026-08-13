const { app, BrowserWindow, globalShortcut, screen, ipcMain } = require('electron');
const path = require('path');

let mainWindow = null;

function createWindow() {
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize;

  const windowWidth = 900;
  const windowHeight = screenHeight - 40;

  mainWindow = new BrowserWindow({
    width: windowWidth,
    height: windowHeight,
    x: Math.floor((screenWidth - windowWidth) / 2),
    y: 20,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: false,
    skipTaskbar: true,
    hasShadow: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  // Force window to appear above fullscreen apps (like games or video players)
  mainWindow.setAlwaysOnTop(true, 'screen-saver');
  mainWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });

  const isDev = !app.isPackaged;
  if (isDev) {
    const devUrl = 'http://localhost:5173';
    const loadDev = () => {
      mainWindow.loadURL(devUrl).catch(() => {
        setTimeout(loadDev, 1000);
      });
    };
    loadDev();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  // Register keyboard shortcuts safely
  app.whenReady().then(() => {}).catch(() => {});
}

function registerShortcuts() {
  try { globalShortcut.unregisterAll(); } catch (e) {}

  const shortcuts = [
    'CommandOrControl+Super',
    'CommandOrControl+Win',
    'CommandOrControl+Space'
  ];

  for (const sc of shortcuts) {
    try {
      globalShortcut.register(sc, triggerHotkey);
    } catch (e) {
      console.log(`[Shortcut] Could not register: ${sc}`);
    }
  }
}

function triggerHotkey() {
  if (mainWindow) {
    mainWindow.webContents.send('trigger-listening');
    mainWindow.show();
    mainWindow.focus();
  }
}

// Dynamic window resizing via IPC
ipcMain.on('resize-window', (event, { width, height }) => {
  if (mainWindow) {
    try { mainWindow.setSize(width, height); } catch (e) {}
  }
});

// Wakes up the window when triggered globally from Python
ipcMain.on('wake-up', () => {
  if (mainWindow) {
    mainWindow.show();
    mainWindow.focus();
  }
});

app.whenReady().then(() => {
  createWindow();
  registerShortcuts();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('will-quit', () => {
  try { globalShortcut.unregisterAll(); } catch (e) {}
});
