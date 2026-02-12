// src/apps/desktop/src/electron/auto-updater.ts
import { MS_PER_HOUR } from '@abe-stack/shared';
import { autoUpdater } from 'electron';

import type { BrowserWindow } from 'electron';

/** Interval between update checks: 4 hours in milliseconds */
const UPDATE_CHECK_INTERVAL_MS = 4 * MS_PER_HOUR;

/**
 * Sends a typed IPC message to the renderer process.
 * Silently skips if the window is destroyed.
 */
function sendToRenderer(mainWindow: BrowserWindow, channel: string, payload?: unknown): void {
  if (!mainWindow.isDestroyed()) {
    if (payload !== undefined) {
      mainWindow.webContents.send(channel, payload);
    } else {
      mainWindow.webContents.send(channel);
    }
  }
}

/**
 * Initializes the Electron auto-updater and wires lifecycle events
 * to the renderer process via IPC.
 *
 * Uses Electron's built-in `autoUpdater` (Squirrel-based).
 * For production builds using electron-builder, swap to `electron-updater`
 * and replace `autoUpdater` with its default export — the IPC surface stays
 * the same.
 *
 * @param mainWindow - The main BrowserWindow to notify about update events
 */
export function initAutoUpdater(mainWindow: BrowserWindow): void {
  // --- Updater lifecycle events ---

  autoUpdater.on('update-available', () => {
    console.log('[AutoUpdater] Update available');
    sendToRenderer(mainWindow, 'update-available');
  });

  autoUpdater.on('update-downloaded', (_event, _releaseNotes, releaseName) => {
    console.log(`[AutoUpdater] Update downloaded: ${releaseName}`);
    sendToRenderer(mainWindow, 'update-ready', { version: releaseName });
  });

  autoUpdater.on('error', (error: Error) => {
    console.error('[AutoUpdater] Error:', error.message);
    // Don't surface transient network errors to the user; just log them.
  });

  // --- Periodic update checks ---

  /**
   * Safely triggers an update check.
   * The built-in autoUpdater requires a feed URL to be set; if it
   * hasn't been configured yet (e.g. in development), the call will
   * throw — we catch and log rather than crash.
   */
  const checkForUpdates = (): void => {
    try {
      autoUpdater.checkForUpdates();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.warn('[AutoUpdater] Could not check for updates:', message);
    }
  };

  // Check immediately on launch
  checkForUpdates();

  // Re-check every 4 hours
  setInterval(checkForUpdates, UPDATE_CHECK_INTERVAL_MS);
}
