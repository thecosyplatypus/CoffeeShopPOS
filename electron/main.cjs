const { app, BrowserWindow, screen, Tray, Menu, nativeImage, Notification, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow = null;
let tray = null;
const isDev = !app.isPackaged;

function createWindow() {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;

  mainWindow = new BrowserWindow({
    width: Math.min(width, 1400),
    height: Math.min(height, 900),
    minWidth: 1024, minHeight: 768,
    icon: path.join(__dirname, '../public/icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
    },
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    backgroundColor: '#1a0e06',
    show: false,
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.once('ready-to-show', () => mainWindow.show());
  mainWindow.on('closed', () => { mainWindow = null; });

  setupTray();
  setupIpc();
}

function setupTray() {
  const icon = nativeImage.createEmpty();
  tray = new Tray(icon);
  tray.setToolTip('CoffeeShop POS');

  const contextMenu = Menu.buildFromTemplate([
    { label: 'Open POS', click: () => mainWindow?.show() },
    { label: 'Dashboard', click: () => { mainWindow?.webContents.send('navigate', '/dashboard'); mainWindow?.show(); } },
    { type: 'separator' },
    { label: 'Quit', click: () => app.quit() },
  ]);

  tray.setContextMenu(contextMenu);
  tray.on('click', () => { mainWindow?.show(); mainWindow?.focus(); });
}

function setupIpc() {
  ipcMain.handle('show-notification', (_event, { title, body }) => {
    if (Notification.isSupported()) new Notification({ title, body }).show();
  });
  ipcMain.handle('get-app-version', () => app.getVersion());
  ipcMain.handle('get-wasm-binary', () => {
    try {
      const wasmPath = path.join(__dirname, '..', 'dist', 'sql-wasm.wasm');
      const data = fs.readFileSync(wasmPath);
      return data;
    } catch (e) {
      console.error('[Electron] Failed to read WASM binary:', e.message);
      return null;
    }
  });

  const dbPath = path.join(app.getPath('userData'), 'database.sqlite');
  ipcMain.handle('load-database', () => {
    try {
      if (fs.existsSync(dbPath)) return fs.readFileSync(dbPath);
      return null;
    } catch (e) {
      console.error('[Electron] Failed to load database:', e.message);
      return null;
    }
  });
  ipcMain.handle('save-database', (_event, buffer) => {
    try {
      const dir = path.dirname(dbPath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(dbPath, Buffer.from(buffer));
      return true;
    } catch (e) {
      console.error('[Electron] Failed to save database:', e.message);
      return false;
    }
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
