// Remove any ambient environment variable that forces Electron to run as plain Node
delete process.env.ELECTRON_RUN_AS_NODE;

const { app, BrowserWindow, screen, ipcMain, Tray, Menu, globalShortcut, desktopCapturer } = require('electron');
const path = require('path');
const http = require('http');
const fs = require('fs');

function getEnvApiKey() {
  try {
    const envPaths = [
      path.join(__dirname, '..', '.env'),
      path.join(__dirname, '.env'),
      path.join(__dirname, '..', 'config.js')
    ];
    for (const p of envPaths) {
      if (fs.existsSync(p)) {
        const content = fs.readFileSync(p, 'utf8');
        const match = content.match(/GEMINI_API_KEY\s*[:=]\s*["']?([^"'\r\n,]+)["']?/);
        if (match && match[1]) return match[1].trim();
      }
    }
  } catch (e) {}
  return process.env.GEMINI_API_KEY || null;
}

let mainWindow = null;
let tray = null;
let currentMode = 'orb';
let orbPosition = null;

// Hardware acceleration for liquid-glass shaders & smooth 60fps animations
app.commandLine.appendSwitch('enable-gpu-rasterization');
app.commandLine.appendSwitch('enable-zero-copy');
app.commandLine.appendSwitch('ignore-gpu-blocklist');

function getDisplayBounds() {
  const primaryDisplay = screen.getPrimaryDisplay();
  return primaryDisplay.workArea;
}

function calculateBounds(mode) {
  if (mode === 'float') mode = 'orb';
  const workArea = getDisplayBounds();
  
  if (mode === 'orb') {
    const width = 200;
    const height = 200;
    if (orbPosition) {
      return {
        x: Math.round(Math.max(workArea.x, Math.min(workArea.x + workArea.width - width, orbPosition.x))),
        y: Math.round(Math.max(workArea.y, Math.min(workArea.y + workArea.height - height, orbPosition.y))),
        width,
        height
      };
    }
    return {
      x: Math.round(workArea.x + workArea.width - width - 24),
      y: Math.round(workArea.y + workArea.height - height - 32),
      width,
      height
    };
  }

  if (mode === 'compact') {
    const width = 480;
    const height = Math.min(740, workArea.height - 40);
    return {
      x: Math.round(workArea.x + workArea.width - width - 24),
      y: Math.round(workArea.y + workArea.height - height - 24),
      width,
      height
    };
  }

  // mode === 'full'
  const width = Math.min(940, workArea.width - 60);
  const height = Math.min(840, workArea.height - 60);
  return {
    x: Math.round(workArea.x + (workArea.width - width) / 2),
    y: Math.round(workArea.y + (workArea.height - height) / 2),
    width,
    height
  };
}

function setWindowMode(targetMode) {
  if (targetMode === 'float') targetMode = 'orb';
  if (!mainWindow || mainWindow.isDestroyed()) return;

  const prevMode = currentMode;
  currentMode = targetMode;

  if (prevMode === 'orb') {
    const [x, y] = mainWindow.getPosition();
    orbPosition = { x, y };
  }

  const targetBounds = calculateBounds(targetMode);
  
  if (targetMode === 'orb') {
    mainWindow.setSkipTaskbar(true);
    mainWindow.setBounds(targetBounds, true);
    mainWindow.setResizable(false);
  } else {
    mainWindow.setSkipTaskbar(false);
    mainWindow.setBounds(targetBounds, true);
    mainWindow.setResizable(true);
  }

  mainWindow.setAlwaysOnTop(true, 'screen-saver');
}

function resetPosition() {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  orbPosition = null;
  setWindowMode(currentMode);
}

function createMainWindow() {
  const initialBounds = calculateBounds('orb');

  mainWindow = new BrowserWindow({
    x: initialBounds.x,
    y: initialBounds.y,
    width: initialBounds.width,
    height: initialBounds.height,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    hasShadow: false,
    backgroundColor: '#00000000',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  mainWindow.setAlwaysOnTop(true, 'screen-saver');
  mainWindow.setVisibleOnAllWorkspaces(true);

  // Check if local dev HTTP server is reachable on port 8080, otherwise load local file
  const localFilePath = path.resolve(__dirname, '..', 'index.html');
  
  const req = http.get('http://localhost:8080', (res) => {
    mainWindow.loadURL('http://localhost:8080/?host=desktop');
  });

  req.on('error', () => {
    mainWindow.loadFile(localFilePath, { query: { host: 'desktop' } });
  });

  mainWindow.webContents.on('did-fail-load', () => {
    mainWindow.loadFile(localFilePath, { query: { host: 'desktop' } });
  });

  mainWindow.webContents.on('did-finish-load', () => {
    const key = getEnvApiKey();
    if (key) {
      mainWindow.webContents.executeJavaScript(`
        if (typeof persistGeminiKey === 'function') {
          persistGeminiKey(${JSON.stringify(key)});
        }
      `).catch(() => {});
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function setupTray() {
  const iconPath = path.join(__dirname, 'assets', 'tray.png');
  tray = new Tray(iconPath);
  tray.setToolTip('Aura Pro 2.0 (Floating AI)');

  const updateContextMenu = () => {
    const contextMenu = Menu.buildFromTemplate([
      { label: 'Aura Pro 2.0 — Floating AI', enabled: false },
      { type: 'separator' },
      {
        label: 'Floating Orb',
        type: 'radio',
        checked: currentMode === 'orb',
        click: () => {
          setWindowMode('orb');
          mainWindow.webContents.send('aura:shortcut-toggle');
        }
      },
      {
        label: 'Compact Sheet',
        type: 'radio',
        checked: currentMode === 'compact',
        click: () => {
          setWindowMode('compact');
          mainWindow.webContents.send('aura:shortcut-toggle');
        }
      },
      {
        label: 'Full Workspace',
        type: 'radio',
        checked: currentMode === 'full',
        click: () => setWindowMode('full')
      },
      { type: 'separator' },
      {
        label: 'Reset Position to Corner',
        click: () => resetPosition()
      },
      {
        label: 'Toggle Shortcut (Ctrl+Shift+Space)',
        click: () => {
          if (mainWindow) {
            mainWindow.webContents.send('aura:shortcut-toggle');
          }
        }
      },
      { type: 'separator' },
      {
        label: 'Quit Aura Pro',
        click: () => {
          app.isQuitting = true;
          app.quit();
        }
      }
    ]);
    tray.setContextMenu(contextMenu);
  };

  updateContextMenu();

  tray.on('click', () => {
    if (!mainWindow) return;
    if (currentMode === 'orb') {
      setWindowMode('compact');
    } else {
      setWindowMode('orb');
    }
    updateContextMenu();
    mainWindow.webContents.send('aura:shortcut-toggle');
  });
}

function registerShortcuts() {
  // Global hotkey to summon / toggle Aura from anywhere in the OS
  const shortcut = 'CommandOrControl+Shift+Space';
  globalShortcut.register(shortcut, () => {
    if (!mainWindow) return;
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
    mainWindow.webContents.send('aura:shortcut-toggle');
  });

  // Global hotkey to trigger Live Screen View (Vision)
  const visionShortcut = 'CommandOrControl+Shift+S';
  globalShortcut.register(visionShortcut, () => {
    if (!mainWindow) return;
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
    mainWindow.webContents.send('aura:trigger-screen-capture');
  });
}

// IPC Handlers
ipcMain.handle('aura:capture-screen', async () => {
  try {
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width, height } = primaryDisplay.size;
    const sources = await desktopCapturer.getSources({
      types: ['screen'],
      thumbnailSize: { width: Math.min(width, 1920), height: Math.min(height, 1080) }
    });
    if (!sources || sources.length === 0) {
      throw new Error('No active display screen source found');
    }
    const screenSource = sources[0];
    const jpegBuffer = screenSource.thumbnail.toJPEG(82);
    const base64 = jpegBuffer.toString('base64');
    return {
      success: true,
      data: base64,
      mimeType: 'image/jpeg',
      width: screenSource.thumbnail.getSize().width,
      height: screenSource.thumbnail.getSize().height
    };
  } catch (err) {
    console.error('[AuraDesktop] Screen capture failed:', err);
    return { success: false, error: err.message };
  }
});
ipcMain.on('aura:get-env-key', (event) => {
  event.returnValue = getEnvApiKey();
});

ipcMain.on('aura:set-mode', (event, mode) => {
  if (mode === 'float') mode = 'orb';
  setWindowMode(mode);
});

ipcMain.on('aura:drag-window', (event, { dx, dy }) => {
  if (!mainWindow || (currentMode !== 'orb' && currentMode !== 'float')) return;
  const [currX, currY] = mainWindow.getPosition();
  const newX = Math.round(currX + dx);
  const newY = Math.round(currY + dy);
  mainWindow.setPosition(newX, newY);
  orbPosition = { x: newX, y: newY };
});

ipcMain.on('aura:snap-window', (event, edge) => {
  if (!mainWindow || (currentMode !== 'orb' && currentMode !== 'float')) return;
  const workArea = getDisplayBounds();
  const [currX, currY] = mainWindow.getPosition();
  const width = 200;
  
  let targetX;
  if (edge === 'left' || (!edge && currX + width / 2 < workArea.x + workArea.width / 2)) {
    targetX = workArea.x + 20;
  } else {
    targetX = workArea.x + workArea.width - width - 20;
  }
  const targetY = Math.round(Math.max(workArea.y + 20, Math.min(workArea.y + workArea.height - width - 20, currY)));
  mainWindow.setPosition(targetX, targetY);
  orbPosition = { x: targetX, y: targetY };
});

ipcMain.on('aura:minimize-tray', () => {
  setWindowMode('orb');
});

ipcMain.on('aura:close-app', () => {
  app.isQuitting = true;
  app.quit();
});

// App Lifecycle
app.whenReady().then(() => {
  createMainWindow();
  setupTray();
  registerShortcuts();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
