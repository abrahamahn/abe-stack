// apps/desktop/src/electron/main.ts
import * as path from 'path';

import { waitForPort } from '@abe-stack/shared';
import { app, BrowserWindow, nativeTheme } from 'electron';

import { registerIPCHandlers } from './ipc';

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
// Register all IPC handlers
registerIPCHandlers(getMainWindow);

// Force system theme detection
nativeTheme.themeSource = 'system';
console.log(`[Main] System theme detected: ${nativeTheme.shouldUseDarkColors ? 'dark' : 'light'}`);

// ============================================================================
// Window Management
// ============================================================================

const createWindow = async (): Promise<void> => {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
  });

  // Load the app
  if (process.env['NODE_ENV'] === 'development') {
    console.log('[Main] Starting in development mode...');
    const rendererPortPreference = Number(
      process.env['DESKTOP_RENDERER_PORT'] ?? process.env['VITE_PORT'] ?? 5174,
    );
    console.log(`[Main] Waiting for renderer on ports starting with ${rendererPortPreference}...`);
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
    void mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
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
