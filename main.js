import 'dotenv/config';
import { app, BrowserWindow, desktopCapturer, globalShortcut, ipcMain, nativeImage, screen, shell, systemPreferences } from 'electron';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { SimpleStore } from './src/utils/simple-store.js';
import { askZoStream, getAvailableModels } from './src/zo.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const isMac = process.platform === 'darwin';

const store = new SimpleStore();

let overlayWin = null;
let currentConversationId = null;

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

  // Apply stealth mode (content protection) based on setting
  const stealthEnabled = store.get('stealthMode') !== false; // default true
  overlayWin.setContentProtection(stealthEnabled);

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

function snapToCorner(corner) {
  if (!overlayWin || overlayWin.isDestroyed()) return;
  const point = screen.getCursorScreenPoint();
  const { workArea } = screen.getDisplayNearestPoint(point);
  const { width: w, height: h } = overlayWin.getBounds();
  const margin = 20;

  let x, y;
  if (corner === 'bottom-left') {
    x = workArea.x + margin;
    y = workArea.y + workArea.height - h - margin;
  } else if (corner === 'top-right') {
    x = workArea.x + workArea.width - w - margin;
    y = workArea.y + margin;
  } else if (corner === 'bottom-right') {
    x = workArea.x + workArea.width - w - margin;
    y = workArea.y + workArea.height - h - margin;
  } else { // top-left
    x = workArea.x + margin;
    y = workArea.y + margin;
  }

  overlayWin.setPosition(Math.round(x), Math.round(y), false);
  if (!overlayWin.isVisible()) {
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

  // Corner snap shortcuts
  globalShortcut.register('CommandOrControl+Shift+Left', () => snapToCorner('bottom-left'));
  globalShortcut.register('CommandOrControl+Shift+Right', () => snapToCorner('top-right'));

  // Mini mode toggle
  globalShortcut.register('CommandOrControl+Shift+Down', () => {
    overlayWin?.webContents.send('mode:mini');
  });
  globalShortcut.register('CommandOrControl+Shift+Up', () => {
    overlayWin?.webContents.send('mode:full');
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

// IPC: Stealth mode (content protection)
ipcMain.handle('stealth:set', (_evt, enabled) => {
  store.set('stealthMode', enabled);
  if (overlayWin && !overlayWin.isDestroyed()) {
    overlayWin.setContentProtection(enabled);
  }
  return enabled;
});

ipcMain.handle('stealth:get', () => {
  return store.get('stealthMode') !== false; // default true
});

// IPC: Screenshot capture
ipcMain.handle('screenshot:capture', async () => {
  const restoreOverlay = () => {
    if (overlayWin && !overlayWin.isDestroyed()) {
      overlayWin.showInactive();
      overlayWin.focus();
    }
  };

  try {
    // Check screen recording permission on macOS
    if (isMac) {
      const status = systemPreferences.getMediaAccessStatus('screen');
      console.log('[screenshot] macOS screen permission status:', status);
      if (status !== 'granted') {
        // Open System Settings to Screen Recording
        shell.openExternal('x-apple.systempreferences:com.apple.preference.security?Privacy_ScreenCapture');
        return {
          ok: false,
          error: 'Screen recording permission required. Enable Zo in System Settings, then try again.'
        };
      }
    }

    // Hide overlay briefly to avoid capturing it
    const wasVisible = overlayWin?.isVisible();
    if (wasVisible) overlayWin.hide();

    // Small delay to ensure overlay is hidden
    await new Promise(r => setTimeout(r, 150));

    // Get the display where the cursor is
    const point = screen.getCursorScreenPoint();
    const display = screen.getDisplayNearestPoint(point);
    console.log('[screenshot] Capturing display:', display.id, display.size);

    let sources;
    try {
      sources = await desktopCapturer.getSources({
        types: ['screen'],
        thumbnailSize: {
          width: Math.floor(display.size.width * display.scaleFactor),
          height: Math.floor(display.size.height * display.scaleFactor)
        }
      });
      console.log('[screenshot] Got sources:', sources.length);
    } catch (captureError) {
      console.error('[screenshot] desktopCapturer error:', captureError);
      if (wasVisible) restoreOverlay();
      return { ok: false, error: 'Failed to capture screen: ' + String(captureError) };
    }

    // Show overlay again
    if (wasVisible) restoreOverlay();

    if (!sources || sources.length === 0) {
      console.log('[screenshot] No sources found');
      return { ok: false, error: 'No screen sources found' };
    }

    // Find the source for the current display
    let source = sources.find(s => s.display_id === String(display.id));
    if (!source) source = sources[0];
    console.log('[screenshot] Using source:', source.name, source.display_id);

    // Convert to base64 PNG
    const image = source.thumbnail;
    if (image.isEmpty()) {
      console.log('[screenshot] Thumbnail is empty');
      return { ok: false, error: 'Screenshot captured but image is empty' };
    }

    const base64 = image.toPNG().toString('base64');
    console.log('[screenshot] Success, size:', image.getSize());

    return { ok: true, base64, width: image.getSize().width, height: image.getSize().height };
  } catch (e) {
    console.error('[screenshot:capture]', e);
    restoreOverlay();
    return { ok: false, error: String(e) };
  }
});

// IPC: Overlay control
ipcMain.on('overlay:toggle', toggleOverlay);
let miniModeActive = false;

ipcMain.on('overlay:resize', (_evt, size = {}) => {
  if (!overlayWin || overlayWin.isDestroyed()) return;
  const bounds = overlayWin.getBounds();
  // Allow mini mode (smaller sizes) or regular mode
  const minW = size.mini ? 200 : 640;
  const minH = size.mini ? 40 : 280;
  const w = Number.isFinite(size.width) ? Math.round(Math.min(Math.max(size.width, minW), 1200)) : bounds.width;
  const h = Number.isFinite(size.height) ? Math.round(Math.min(Math.max(size.height, minH), 800)) : bounds.height;

  const point = screen.getCursorScreenPoint();
  const { workArea } = screen.getDisplayNearestPoint(point);

  // Recenter (when restoring from mini mode)
  if (size.recenter) {
    miniModeActive = false;
    const x = workArea.x + (workArea.width - w) / 2;
    const y = workArea.y + Math.max(24, workArea.height * 0.06);
    overlayWin.setBounds({ x: Math.round(x), y: Math.round(y), width: w, height: h }, false);
  }
  // Mini mode - anchor to bottom-right (grow upward)
  else if (size.mini) {
    miniModeActive = true;
    // Keep bottom-right corner fixed at 20px from edges
    const x = workArea.x + workArea.width - w - 20;
    const y = workArea.y + workArea.height - h - 20;
    overlayWin.setBounds({ x: Math.round(x), y: Math.round(y), width: w, height: h }, false);
  }
  // Normal resize
  else if (w !== bounds.width || h !== bounds.height) {
    overlayWin.setBounds({ ...bounds, width: w, height: h }, false);
  }
});

// IPC: Zo API (streaming)
ipcMain.handle('zo:ask', async (_evt, input, modelName = null) => {
  try {
    const token = store.get('zoToken') || process.env.ZO_ACCESS_TOKEN || '';
    const model = modelName || store.get('selectedModel') || null;
    const { output, conversationId } = await askZoStream(
      input,
      token,
      currentConversationId,
      (chunk) => overlayWin?.webContents.send('zo:chunk', chunk),
      (status) => overlayWin?.webContents.send('zo:status', status),
      model
    );
    currentConversationId = conversationId;
    return { ok: true, output, conversationId };
  } catch (e) {
    console.error('[zo:ask]', e);
    return { ok: false, error: String(e) };
  }
});

// IPC: Get available models
ipcMain.handle('zo:models', async () => {
  try {
    const token = store.get('zoToken') || process.env.ZO_ACCESS_TOKEN || '';
    const models = await getAvailableModels(token);
    return { ok: true, models };
  } catch (e) {
    console.error('[zo:models]', e);
    return { ok: false, error: String(e), models: [] };
  }
});

// IPC: Set selected model
ipcMain.handle('zo:setModel', (_evt, modelName) => {
  store.set('selectedModel', modelName);
  return { ok: true };
});

// IPC: Get selected model
ipcMain.handle('zo:getModel', () => {
  return store.get('selectedModel') || null;
});

// IPC: Reset conversation
ipcMain.on('zo:new-conversation', () => {
  currentConversationId = null;
});


// IPC: Quit
ipcMain.handle('app:quit', () => {
  app.quit();
  return { ok: true };
});

// IPC: Open external URL
ipcMain.handle('shell:openExternal', (_evt, url) => {
  if (typeof url === 'string' && (url.startsWith('https://') || url.startsWith('http://'))) {
    shell.openExternal(url);
    return { ok: true };
  }
  return { ok: false, error: 'Invalid URL' };
});
