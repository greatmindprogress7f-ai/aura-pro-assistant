const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('AuraDesktop', {
  isDesktop: true,
  getEnvApiKey: () => ipcRenderer.sendSync('aura:get-env-key'),
  setMode: (mode) => ipcRenderer.send('aura:set-mode', mode),
  dragWindow: (dx, dy) => ipcRenderer.send('aura:drag-window', { dx, dy }),
  snapWindow: (edge) => ipcRenderer.send('aura:snap-window', edge),
  minimizeToTray: () => ipcRenderer.send('aura:minimize-tray'),
  closeApp: () => ipcRenderer.send('aura:close-app'),
  captureScreen: () => ipcRenderer.invoke('aura:capture-screen'),
  onShortcutTriggered: (callback) => {
    ipcRenderer.on('aura:shortcut-toggle', () => callback());
  },
  onScreenCaptureTriggered: (callback) => {
    ipcRenderer.on('aura:trigger-screen-capture', () => callback());
  }
});
