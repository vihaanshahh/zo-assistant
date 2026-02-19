const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('stealth', {
  getSettings: () => ipcRenderer.invoke('settings:get'),
  setSettings: (patch) => ipcRenderer.invoke('settings:set', patch),
  toggleOverlay: () => ipcRenderer.send('overlay:toggle'),
  resizeOverlay: (size) => ipcRenderer.send('overlay:resize', size),
  onHotkeySubmit: (cb) => ipcRenderer.on('hotkey:submit', cb),
  zoAsk: (input, modelName) => ipcRenderer.invoke('zo:ask', input, modelName),
  onZoChunk: (cb) => ipcRenderer.on('zo:chunk', (_, chunk) => cb(chunk)),
  onZoStatus: (cb) => ipcRenderer.on('zo:status', (_, status) => cb(status)),
  newConversation: () => ipcRenderer.send('zo:new-conversation'),
  quitApp: () => ipcRenderer.invoke('app:quit'),
  getStealthMode: () => ipcRenderer.invoke('stealth:get'),
  setStealthMode: (enabled) => ipcRenderer.invoke('stealth:set', enabled),
  openExternal: (url) => ipcRenderer.invoke('shell:openExternal', url),
  onMiniMode: (cb) => ipcRenderer.on('mode:mini', cb),
  onFullMode: (cb) => ipcRenderer.on('mode:full', cb),
  getModels: () => ipcRenderer.invoke('zo:models'),
  setModel: (name) => ipcRenderer.invoke('zo:setModel', name),
  getModel: () => ipcRenderer.invoke('zo:getModel'),
});
