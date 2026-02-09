// src/apps/desktop/src/electron/ipc/handlers.ts
import { app, dialog, ipcMain, Notification } from 'electron';

import { IPC_CHANNELS } from '../types';

import type { OpenDialogOptions, SaveDialogOptions } from '../types';
import type { BrowserWindow } from 'electron';

/**
 * Registers all IPC handlers for communication between main and renderer processes.
 * This centralizes IPC handler definitions for better organization and maintainability.
 *
 * @param getMainWindow - Getter function to access the main BrowserWindow instance
 */
export function registerIPCHandlers(getMainWindow: () => BrowserWindow | null): void {
  // Get application version
  ipcMain.handle(IPC_CHANNELS.getAppVersion, () => {
    return app.getVersion();
  });

  // Show native open file dialog
  ipcMain.handle(IPC_CHANNELS.showOpenDialog, async (_event, options: OpenDialogOptions) => {
    const mainWindow = getMainWindow();
    if (mainWindow === null) return null;

    const result = await dialog.showOpenDialog(mainWindow, {
      ...(options.title !== undefined && { title: options.title }),
      ...(options.filters !== undefined && { filters: options.filters }),
      properties: options.multiple === true ? ['openFile', 'multiSelections'] : ['openFile'],
    });

    return result.canceled ? null : result.filePaths;
  });

  // Show native save file dialog
  ipcMain.handle(IPC_CHANNELS.showSaveDialog, async (_event, options: SaveDialogOptions) => {
    const mainWindow = getMainWindow();
    if (mainWindow === null) return null;

    const result = await dialog.showSaveDialog(mainWindow, {
      ...(options.title !== undefined && { title: options.title }),
      ...(options.defaultPath !== undefined && { defaultPath: options.defaultPath }),
      ...(options.filters !== undefined && { filters: options.filters }),
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
