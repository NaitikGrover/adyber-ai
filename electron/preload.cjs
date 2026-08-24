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
});
