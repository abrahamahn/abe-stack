// main/apps/desktop/src/electron/menu.test.ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  buildFromTemplate: vi.fn().mockReturnValue({ items: [] }),
  setApplicationMenu: vi.fn(),
  getName: vi.fn().mockReturnValue('Abe Stack'),
  getVersion: vi.fn().mockReturnValue('1.0.0'),
  showMessageBox: vi.fn(),
}));

vi.mock('electron', () => ({
  app: {
    name: 'Abe Stack',
    getVersion: mocks.getVersion,
  },
  Menu: {
    buildFromTemplate: mocks.buildFromTemplate,
    setApplicationMenu: mocks.setApplicationMenu,
  },
  dialog: {
    showMessageBox: mocks.showMessageBox,
  },
}));

import { createApplicationMenu } from './menu';

import type { BrowserWindow, MenuItemConstructorOptions } from 'electron';

function createMockWindow(): BrowserWindow {
  return {
    id: 1,
    webContents: { send: vi.fn() },
  } as unknown as BrowserWindow;
}

describe('createApplicationMenu', () => {
  const originalPlatform = process.platform;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    Object.defineProperty(process, 'platform', { value: originalPlatform });
  });

  it('should build a menu from template and set it as the application menu', () => {
    const mainWindow = createMockWindow();
    const menu = createApplicationMenu(mainWindow);

    expect(mocks.buildFromTemplate).toHaveBeenCalledTimes(1);
    expect(mocks.setApplicationMenu).toHaveBeenCalledTimes(1);
    expect(mocks.setApplicationMenu).toHaveBeenCalledWith(menu);
  });

  it('should include Edit, View, Window, and Help menus on all platforms', () => {
    const mainWindow = createMockWindow();
    createApplicationMenu(mainWindow);

    const template = mocks.buildFromTemplate.mock.calls[0]![0] as MenuItemConstructorOptions[];
    const labels = template.map((item) => item.label);

    expect(labels).toContain('Edit');
    expect(labels).toContain('View');
    expect(labels).toContain('Window');
    expect(labels).toContain('Help');
  });

  describe('macOS', () => {
    beforeEach(() => {
      Object.defineProperty(process, 'platform', { value: 'darwin' });
    });

    it('should include app menu with app name as first item', () => {
      const mainWindow = createMockWindow();
      createApplicationMenu(mainWindow);

      const template = mocks.buildFromTemplate.mock.calls[0]![0] as MenuItemConstructorOptions[];
      expect(template[0]!.label).toBe('Abe Stack');
    });

    it('should include quit role in app menu', () => {
      const mainWindow = createMockWindow();
      createApplicationMenu(mainWindow);

      const template = mocks.buildFromTemplate.mock.calls[0]![0] as MenuItemConstructorOptions[];
      const appMenu = template[0]!;
      const submenuItems = appMenu.submenu as MenuItemConstructorOptions[];
      const roles = submenuItems.map((item) => item.role).filter(Boolean);

      expect(roles).toContain('quit');
    });

    it('should not include a File menu on macOS', () => {
      const mainWindow = createMockWindow();
      createApplicationMenu(mainWindow);

      const template = mocks.buildFromTemplate.mock.calls[0]![0] as MenuItemConstructorOptions[];
      const labels = template.map((item) => item.label);

      expect(labels).not.toContain('File');
    });
  });

  describe('Windows / Linux', () => {
    beforeEach(() => {
      Object.defineProperty(process, 'platform', { value: 'win32' });
    });

    it('should include File menu with Quit as first item', () => {
      const mainWindow = createMockWindow();
      createApplicationMenu(mainWindow);

      const template = mocks.buildFromTemplate.mock.calls[0]![0] as MenuItemConstructorOptions[];
      expect(template[0]!.label).toBe('File');
    });

    it('should include quit role in File menu', () => {
      const mainWindow = createMockWindow();
      createApplicationMenu(mainWindow);

      const template = mocks.buildFromTemplate.mock.calls[0]![0] as MenuItemConstructorOptions[];
      const fileMenu = template[0]!;
      const submenuItems = fileMenu.submenu as MenuItemConstructorOptions[];
      const roles = submenuItems.map((item) => item.role).filter(Boolean);

      expect(roles).toContain('quit');
    });
  });

  describe('Edit menu', () => {
    it('should include standard editing roles', () => {
      const mainWindow = createMockWindow();
      createApplicationMenu(mainWindow);

      const template = mocks.buildFromTemplate.mock.calls[0]![0] as MenuItemConstructorOptions[];
      const editMenu = template.find((item) => item.label === 'Edit')!;
      const submenuItems = editMenu.submenu as MenuItemConstructorOptions[];
      const roles = submenuItems.map((item) => item.role).filter(Boolean);

      expect(roles).toContain('undo');
      expect(roles).toContain('redo');
      expect(roles).toContain('cut');
      expect(roles).toContain('copy');
      expect(roles).toContain('paste');
      expect(roles).toContain('selectAll');
    });
  });

  describe('View menu', () => {
    it('should include reload and devtools roles', () => {
      const mainWindow = createMockWindow();
      createApplicationMenu(mainWindow);

      const template = mocks.buildFromTemplate.mock.calls[0]![0] as MenuItemConstructorOptions[];
      const viewMenu = template.find((item) => item.label === 'View')!;
      const submenuItems = viewMenu.submenu as MenuItemConstructorOptions[];
      const roles = submenuItems.map((item) => item.role).filter(Boolean);

      expect(roles).toContain('reload');
      expect(roles).toContain('toggleDevTools');
      expect(roles).toContain('zoomIn');
      expect(roles).toContain('zoomOut');
    });
  });

  describe('Window menu', () => {
    it('should include minimize and close roles', () => {
      const mainWindow = createMockWindow();
      createApplicationMenu(mainWindow);

      const template = mocks.buildFromTemplate.mock.calls[0]![0] as MenuItemConstructorOptions[];
      const windowMenu = template.find((item) => item.label === 'Window')!;
      const submenuItems = windowMenu.submenu as MenuItemConstructorOptions[];
      const roles = submenuItems.map((item) => item.role).filter(Boolean);

      expect(roles).toContain('minimize');
      expect(roles).toContain('close');
    });
  });

  describe('Help menu', () => {
    it('should include About menu item', () => {
      const mainWindow = createMockWindow();
      createApplicationMenu(mainWindow);

      const template = mocks.buildFromTemplate.mock.calls[0]![0] as MenuItemConstructorOptions[];
      const helpMenu = template.find((item) => item.label === 'Help')!;
      const submenuItems = helpMenu.submenu as MenuItemConstructorOptions[];
      const labels = submenuItems.map((item) => item.label).filter(Boolean);

      expect(labels).toContain('About');
    });
  });
});
