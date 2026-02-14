// main/apps/desktop/src/electron/menu.ts
import { app, dialog, Menu } from 'electron';

import type { BrowserWindow, MenuItemConstructorOptions } from 'electron';

/**
 * Builds the Edit menu items (shared across all platforms).
 */
function buildEditMenu(): MenuItemConstructorOptions {
  return {
    label: 'Edit',
    submenu: [
      { role: 'undo' },
      { role: 'redo' },
      { type: 'separator' },
      { role: 'cut' },
      { role: 'copy' },
      { role: 'paste' },
      { role: 'selectAll' },
    ],
  };
}

/**
 * Builds the View menu items with reload, devtools toggle, and zoom.
 */
function buildViewMenu(): MenuItemConstructorOptions {
  return {
    label: 'View',
    submenu: [
      { role: 'reload' },
      { role: 'forceReload' },
      { role: 'toggleDevTools' },
      { type: 'separator' },
      { role: 'resetZoom' },
      { role: 'zoomIn' },
      { role: 'zoomOut' },
      { type: 'separator' },
      { role: 'togglefullscreen' },
    ],
  };
}

/**
 * Builds the Window menu items.
 */
function buildWindowMenu(): MenuItemConstructorOptions {
  return {
    label: 'Window',
    submenu: [{ role: 'minimize' }, { role: 'close' }],
  };
}

/**
 * Builds the Help menu with an About option.
 */
function buildHelpMenu(mainWindow: BrowserWindow): MenuItemConstructorOptions {
  return {
    label: 'Help',
    submenu: [
      {
        label: 'About',
        click: (): void => {
          void dialog.showMessageBox(mainWindow, {
            type: 'info',
            title: 'About',
            message: `Abe Stack v${app.getVersion()}`,
            detail: 'Desktop application for Abe Stack.',
          });
        },
      },
    ],
  };
}

/**
 * Creates and returns the application menu.
 *
 * On macOS the first menu is the "app" menu (named after the app). On
 * Windows/Linux it is the traditional "File" menu with a Quit item.
 *
 * @param mainWindow - The main BrowserWindow (used for the About dialog)
 * @returns The constructed Electron Menu
 */
export function createApplicationMenu(mainWindow: BrowserWindow): Menu {
  const template: MenuItemConstructorOptions[] = [];

  if (process.platform === 'darwin') {
    // macOS app menu
    template.push({
      label: app.name,
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' },
      ],
    });
  } else {
    // Windows / Linux — File menu
    template.push({
      label: 'File',
      submenu: [{ role: 'quit' }],
    });
  }

  template.push(buildEditMenu(), buildViewMenu(), buildWindowMenu(), buildHelpMenu(mainWindow));

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);

  return menu;
}
