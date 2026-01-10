// apps/desktop/electron/main.ts
import net from 'node:net';
import * as path from 'path';

import { app, BrowserWindow } from 'electron';

let mainWindow: BrowserWindow | null = null;

// Disable GPU acceleration to avoid renderer crashes on some Linux/WSL setups
app.disableHardwareAcceleration();

function uniquePorts(ports: Array<number | undefined>): number[] {
  return Array.from(new Set(ports.filter((port): port is number => Number.isFinite(port))));
}

function isPortListening(host: string, port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = net.createConnection({ host, port });

    socket.once('connect', () => {
      socket.end();
      resolve(true);
    });

    socket.once('error', () => {
      resolve(false);
    });

    socket.setTimeout(500, () => {
      socket.destroy();
      resolve(false);
    });
  });
}

async function findRendererPort(host: string, ports: number[]): Promise<number> {
  const candidates = uniquePorts(ports);
  const first = candidates[0];

  for (let attempt = 0; attempt < 10; attempt += 1) {
    for (const port of candidates) {
      if (await isPortListening(host, port)) {
        return port;
      }
    }

    await delay(300);
  }

  // Fallback to the first configured port even if we could not detect it
  return first ?? 5174;
}

const createWindow = async (): Promise<void> => {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  // Load the app
  if (process.env.NODE_ENV === 'development') {
    const rendererPortPreference = Number(
      process.env.DESKTOP_RENDERER_PORT || process.env.VITE_PORT || 5174,
    );
    const rendererPort = await findRendererPort('localhost', [
      rendererPortPreference,
      5174,
      5173,
      5175,
    ]);

    const rendererPortString = String(rendererPort);
    await mainWindow.loadURL(`http://localhost:${rendererPortString}`);
    mainWindow.webContents.openDevTools();
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

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
