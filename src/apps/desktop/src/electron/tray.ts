// src/apps/desktop/src/electron/tray.ts
import { join } from 'node:path';

import { app, Menu, Tray } from 'electron';

import type { BrowserWindow } from 'electron';

/** Placeholder icon path — replace with an actual icon asset later. */
const TRAY_ICON_PATH = join(__dirname, '..', 'public', 'icon.png');

/**
 * Creates a system tray icon with a context menu.
 *
 * Clicking the tray icon toggles the main window's visibility.
 * The context menu provides Show/Hide, Open Dashboard, and Quit actions.
 *
 * @param mainWindow - The main BrowserWindow to control
 * @returns The created Tray instance
 */
export function createTray(mainWindow: BrowserWindow): Tray {
  const tray = new Tray(TRAY_ICON_PATH);

  tray.setToolTip('Abe Stack');

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Show / Hide Window',
      click: (): void => {
        if (mainWindow.isVisible()) {
          mainWindow.hide();
        } else {
          mainWindow.show();
          mainWindow.focus();
        }
      },
    },
    {
      label: 'Open Dashboard',
      click: (): void => {
        mainWindow.show();
        mainWindow.focus();
        mainWindow.webContents.send('deep-link-navigation', {
          path: '/dashboard',
          query: {},
        });
      },
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: (): void => {
        app.quit();
      },
    },
  ]);

  tray.setContextMenu(contextMenu);

  // Toggle window visibility on tray icon click
  tray.on('click', () => {
    if (mainWindow.isVisible()) {
      mainWindow.hide();
    } else {
      mainWindow.show();
      mainWindow.focus();
    }
  });

  return tray;
}
