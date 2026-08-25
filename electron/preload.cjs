const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  wakeUp: () => ipcRenderer.send('wake-up'),
  onTriggerListening: (callback) => ipcRenderer.on('trigger-listening', () => callback()),
  setOnboardingMode: () => ipcRenderer.send('window-onboarding'),
  setOrbMode: () => ipcRenderer.send('window-orb'),
  windowMinimize: () => ipcRenderer.send('window-minimize'),
  windowMaximize: () => ipcRenderer.send('window-maximize'),
  windowClose: () => ipcRenderer.send('window-close'),
  hideWindow: () => ipcRenderer.send('window-hide'),
  onOpenDashboard: (callback) => ipcRenderer.on('open-dashboard', () => callback()),
  startRecording: () => ipcRenderer.send('start-recording'),
  stopRecording: () => ipcRenderer.send('stop-recording'),
  startBrowserAuth: () => ipcRenderer.send('start-browser-auth'),
  clearAppSession: () => ipcRenderer.send('clear-app-session'),
  onGoogleAuthSuccess: (callback) => ipcRenderer.on('google-auth-success', (_event, data) => callback(data)),
  resizeWindow: (width, height) => ipcRenderer.send('window-resize', width, height),
  getApiToken: () => ipcRenderer.invoke('get-api-token'),

  // ── Auto-Updater API ──────────────────────────────────────────────────────
  // Trigger an update check manually
  checkForUpdates: () => ipcRenderer.send('check-for-updates'),
  // Start downloading the available update
  downloadUpdate: () => ipcRenderer.send('download-update'),
  // Quit the app and install the downloaded update
  quitAndInstall: () => ipcRenderer.send('quit-and-install'),

  // Event listeners (return cleanup fn so React can remove them on unmount)
  onUpdateAvailable: (callback) => {
    const handler = (_event, data) => callback(data);
    ipcRenderer.on('update-available', handler);
    return () => ipcRenderer.removeListener('update-available', handler);
  },
  onUpdateNotAvailable: (callback) => {
    const handler = () => callback();
    ipcRenderer.on('update-not-available', handler);
    return () => ipcRenderer.removeListener('update-not-available', handler);
  },
  onDownloadProgress: (callback) => {
    const handler = (_event, data) => callback(data);
    ipcRenderer.on('download-progress', handler);
    return () => ipcRenderer.removeListener('download-progress', handler);
  },
  onUpdateDownloaded: (callback) => {
    const handler = (_event, data) => callback(data);
    ipcRenderer.on('update-downloaded', handler);
    return () => ipcRenderer.removeListener('update-downloaded', handler);
  },
  onUpdateError: (callback) => {
    const handler = (_event, data) => callback(data);
    ipcRenderer.on('update-error', handler);
    return () => ipcRenderer.removeListener('update-error', handler);
  },
});
