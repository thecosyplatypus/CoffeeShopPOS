const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  showNotification: (options) => ipcRenderer.invoke('show-notification', options),
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  onNavigate: (callback) => ipcRenderer.on('navigate', (_event, path) => callback(path)),
  getWasmBinary: async () => {
    const buf = await ipcRenderer.invoke('get-wasm-binary');
    if (!buf) return null;
    return new Uint8Array(buf).buffer;
  },
  loadDatabase: async () => {
    const buf = await ipcRenderer.invoke('load-database');
    if (!buf) return null;
    return new Uint8Array(buf).buffer;
  },
  saveDatabase: (buffer) => ipcRenderer.invoke('save-database', buffer),
});
