const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  onTriggerListening: (callback) => ipcRenderer.on('trigger-listening', () => callback()),
  resizeWindow: (width, height) => ipcRenderer.send('resize-window', { width, height }),
  wakeUp: () => ipcRenderer.send('wake-up')
});
