const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('stealth', {
  getSettings: () => ipcRenderer.invoke('settings:get'),
  setSettings: (patch) => ipcRenderer.invoke('settings:set', patch),
  toggleOverlay: () => ipcRenderer.send('overlay:toggle'),
  resizeOverlay: (size) => ipcRenderer.send('overlay:resize', size),
  onHotkeySubmit: (cb) => ipcRenderer.on('hotkey:submit', cb),
  zoAsk: (input) => ipcRenderer.invoke('zo:ask', input),
  onZoChunk: (cb) => ipcRenderer.on('zo:chunk', (_, chunk) => cb(chunk)),
  onZoStatus: (cb) => ipcRenderer.on('zo:status', (_, status) => cb(status)),
  newConversation: () => ipcRenderer.send('zo:new-conversation'),
  quitApp: () => ipcRenderer.invoke('app:quit'),
});
