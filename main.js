import 'dotenv/config';
import { app, BrowserWindow, globalShortcut, ipcMain, nativeImage, screen } from 'electron';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { SimpleStore } from './src/utils/simple-store.js';
import { askZo } from './src/zo.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const isMac = process.platform === 'darwin';

const store = new SimpleStore();

let overlayWin = null;

// App icon
const appIconPngPath = path.join(__dirname, 'src', 'images', 'icon.png');
const appIconJpegPath = path.join(__dirname, 'src', 'images', 'icon.jpeg');
let appIcon = null;
try {
  if (fs.existsSync(appIconPngPath)) {
    appIcon = nativeImage.createFromPath(appIconPngPath);
  } else if (fs.existsSync(appIconJpegPath)) {
    appIcon = nativeImage.createFromPath(appIconJpegPath);
  }
} catch {}

function createOverlay() {
  overlayWin = new BrowserWindow({
    width: 760,
    height: 280,
    show: false,
    frame: false,
    transparent: true,
    hasShadow: true,
    resizable: false,
    movable: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    focusable: true,
    icon: appIcon,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      devTools: true,
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  try {
    overlayWin.setAlwaysOnTop(true, isMac ? 'screen-saver' : 'pop-up-menu');
    overlayWin.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  } catch {}

  overlayWin.loadFile(path.join(__dirname, 'renderer', 'index.html'));
}

function toggleOverlay() {
  if (!overlayWin) return;
  if (overlayWin.isVisible()) {
    overlayWin.hide();
  } else {
    try {
      overlayWin.setAlwaysOnTop(true, isMac ? 'screen-saver' : 'pop-up-menu');
      overlayWin.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
    } catch {}

    const point = screen.getCursorScreenPoint();
    const display = screen.getDisplayNearestPoint(point);
    const { workArea } = display;
    const bounds = overlayWin.getBounds();
    const x = Math.round(workArea.x + (workArea.width - bounds.width) / 2);
    const y = Math.round(workArea.y + Math.max(24, workArea.height * 0.06));
    overlayWin.setPosition(x, y, false);

    overlayWin.showInactive();
    overlayWin.focus();
    overlayWin.moveTop();
  }
}

function registerHotkeys() {
  const hk = store.get('hotkeys') || {};
  globalShortcut.unregisterAll();

  const toggleCombo = hk.toggleOverlay || 'CommandOrControl+Shift+Space';
  const submitCombo = hk.submit || 'CommandOrControl+Return';

  globalShortcut.register(toggleCombo, toggleOverlay);
  globalShortcut.register(submitCombo, () => {
    overlayWin?.webContents.send('hotkey:submit');
  });
}

app.whenReady().then(() => {
  if (isMac && appIcon && !appIcon.isEmpty() && app.dock) {
    try { app.dock.setIcon(appIcon); } catch {}
  }

  createOverlay();
  registerHotkeys();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createOverlay();
  });
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

// IPC: Settings
ipcMain.handle('settings:get', () => store.store);
ipcMain.handle('settings:set', (_evt, patch) => {
  store.set(patch);
  registerHotkeys();
  return store.store;
});

// IPC: Overlay control
ipcMain.on('overlay:toggle', toggleOverlay);
ipcMain.on('overlay:resize', (_evt, size = {}) => {
  if (!overlayWin || overlayWin.isDestroyed()) return;
  const bounds = overlayWin.getBounds();
  const w = Number.isFinite(size.width) ? Math.round(Math.min(Math.max(size.width, 640), 1200)) : bounds.width;
  const h = Number.isFinite(size.height) ? Math.round(Math.min(Math.max(size.height, 280), 800)) : bounds.height;
  if (w !== bounds.width || h !== bounds.height) {
    overlayWin.setBounds({ ...bounds, width: w, height: h }, false);
  }
});

// IPC: Zo API
ipcMain.handle('zo:ask', async (_evt, input) => {
  try {
    const token = store.get('zoToken') || process.env.ZO_ACCESS_TOKEN || '';
    const output = await askZo(input, token);
    return { ok: true, output };
  } catch (e) {
    console.error('[zo:ask]', e);
    return { ok: false, error: String(e) };
  }
});

// IPC: Quit
ipcMain.handle('app:quit', () => {
  app.quit();
  return { ok: true };
});
