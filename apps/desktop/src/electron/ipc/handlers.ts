// apps/desktop/src/electron/ipc/handlers.ts
import { app, dialog, ipcMain, Notification } from 'electron';

import type { BrowserWindow } from 'electron';
import type { OpenDialogOptions, SaveDialogOptions } from '../types';

/**
 * Registers all IPC handlers for communication between main and renderer processes.
 * This centralizes IPC handler definitions for better organization and maintainability.
 *
 * @param getMainWindow - Getter function to access the main BrowserWindow instance
 */
export function registerIPCHandlers(getMainWindow: () => BrowserWindow | null): void {
  // Get application version
  ipcMain.handle('get-app-version', () => {
    return app.getVersion();
  });

  // Show native open file dialog
  ipcMain.handle('show-open-dialog', async (_event, options: OpenDialogOptions) => {
    const mainWindow = getMainWindow();
    if (!mainWindow) return null;

    const result = await dialog.showOpenDialog(mainWindow, {
      title: options.title,
      filters: options.filters,
      properties: options.multiple === true ? ['openFile', 'multiSelections'] : ['openFile'],
    });

    return result.canceled ? null : result.filePaths;
  });

  // Show native save file dialog
  ipcMain.handle('show-save-dialog', async (_event, options: SaveDialogOptions) => {
    const mainWindow = getMainWindow();
    if (!mainWindow) return null;

    const result = await dialog.showSaveDialog(mainWindow, {
      title: options.title,
      defaultPath: options.defaultPath,
      filters: options.filters,
    });

    return result.canceled ? null : result.filePath;
  });

  // Show native notification (one-way, no response)
  ipcMain.on('show-notification', (_event, { title, body }: { title: string; body: string }) => {
    if (Notification.isSupported()) {
      new Notification({ title, body }).show();
    }
  });
}
