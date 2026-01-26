// apps/desktop/src/electron/main.ts
import * as path from 'path';

import { app, BrowserWindow } from 'electron';

import { registerIPCHandlers } from './ipc';
import { waitForPort } from './utils';

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
  if (process.env.NODE_ENV === 'development') {
    const rendererPortPreference = Number(
      process.env.DESKTOP_RENDERER_PORT ?? process.env.VITE_PORT ?? 5174,
    );
    const rendererPort = await waitForPort([rendererPortPreference, 5174, 5173, 5175], 'localhost');

    const rendererPortString = String(rendererPort);
    await mainWindow.loadURL(`http://localhost:${rendererPortString}`);
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
