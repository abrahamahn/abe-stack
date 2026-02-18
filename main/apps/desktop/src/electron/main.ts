// main/apps/desktop/src/electron/main.ts
import { join } from 'node:path';

import { waitForPort } from '@bslt/server-system';
import { app, BrowserWindow, nativeTheme } from 'electron';

import { initAutoUpdater } from './auto-updater';
import { handleDeepLink, registerDeepLinkProtocol } from './deep-links';
import { registerIPCHandlers } from './ipc';
import { createApplicationMenu } from './menu';
import { createTray } from './tray';

let mainWindow: BrowserWindow | null = null;

/**
 * Getter function for the main window, used by IPC handlers
 */
function getMainWindow(): BrowserWindow | null {
  return mainWindow;
}

// Disable GPU acceleration to avoid renderer crashes on some Linux/WSL setups
app.disableHardwareAcceleration();

// Register all IPC handlers
registerIPCHandlers(getMainWindow);

// Register deep link protocol (bslt://)
registerDeepLinkProtocol('bslt');

// Force system theme detection
nativeTheme.themeSource = 'system';
console.log(`[Main] System theme detected: ${nativeTheme.shouldUseDarkColors ? 'dark' : 'light'}`);

// ============================================================================
// Deep Link Handling — macOS
// ============================================================================

// macOS delivers deep links via the open-url event
app.on('open-url', (event, url) => {
  event.preventDefault();
  if (mainWindow !== null) {
    handleDeepLink(url, mainWindow);
  }
});

// ============================================================================
// Deep Link Handling — Windows / Linux (single-instance lock)
// ============================================================================

// Ensure single instance so deep links on Windows/Linux reach the running app
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', (_event, commandLine) => {
    // The deep link URL is the last argument in the command line
    const deepLinkUrl = commandLine.find((arg) => arg.startsWith('bslt://'));
    if (deepLinkUrl !== undefined && mainWindow !== null) {
      handleDeepLink(deepLinkUrl, mainWindow);
    }

    // Focus the existing window
    if (mainWindow !== null) {
      if (mainWindow.isMinimized()) {
        mainWindow.restore();
      }
      mainWindow.focus();
    }
  });
}

// ============================================================================
// Window Management
// ============================================================================

const createWindow = async (): Promise<void> => {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
  });

  // Set up native menu
  createApplicationMenu(mainWindow);

  // Set up system tray
  createTray(mainWindow);

  // Initialize auto-updater (production only — dev builds have no update feed)
  if (process.env['NODE_ENV'] !== 'development') {
    initAutoUpdater(mainWindow);
  }

  // Load the app
  if (process.env['NODE_ENV'] === 'development') {
    console.log('[Main] Starting in development mode...');
    const rendererPortPreference = Number(
      process.env['DESKTOP_RENDERER_PORT'] ?? process.env['VITE_PORT'] ?? 5174,
    );
    console.log(
      `[Main] Waiting for renderer on ports starting with ${String(rendererPortPreference)}...`,
    );
    try {
      const rendererPort: number = await (
        waitForPort as (ports: Array<number | undefined>, host?: string) => Promise<number>
      )([rendererPortPreference, 5174, 5173, 5175], 'localhost');

      const rendererPortString = String(rendererPort);
      console.log(`[Main] Renderer found on port ${rendererPortString}. Loading URL...`);
      await mainWindow.loadURL(`http://localhost:${rendererPortString}`);
      console.log('[Main] URL loaded successfully.');
      mainWindow.webContents.openDevTools();
    } catch (error) {
      console.error('[Main] Failed to load renderer:', error);
    }
  } else {
    void mainWindow.loadFile(join(__dirname, '../renderer/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
};

app.on('ready', () => {
  void createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    void createWindow();
  }
});
