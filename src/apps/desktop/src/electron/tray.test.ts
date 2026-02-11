// src/apps/desktop/src/electron/tray.test.ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  traySetToolTip: vi.fn(),
  traySetContextMenu: vi.fn(),
  trayOn: vi.fn(),
  menuBuildFromTemplate: vi.fn().mockReturnValue({ items: [] }),
  appQuit: vi.fn(),
  webContentsSend: vi.fn(),
  isVisible: vi.fn().mockReturnValue(true),
  show: vi.fn(),
  hide: vi.fn(),
  focus: vi.fn(),
}));

vi.mock('electron', () => {
  class MockTray {
    setToolTip = mocks.traySetToolTip;
    setContextMenu = mocks.traySetContextMenu;
    on = mocks.trayOn;
  }

  return {
    app: {
      quit: mocks.appQuit,
    },
    Menu: {
      buildFromTemplate: mocks.menuBuildFromTemplate,
    },
    Tray: MockTray,
  };
});

vi.mock('node:path', () => {
  const join = vi.fn((...args: string[]) => args.join('/'));
  return {
    join,
    default: { join },
  };
});

import { createTray } from './tray';

import type { BrowserWindow, MenuItemConstructorOptions } from 'electron';

function createMockWindow(): BrowserWindow {
  return {
    isVisible: mocks.isVisible,
    show: mocks.show,
    hide: mocks.hide,
    focus: mocks.focus,
    webContents: {
      send: mocks.webContentsSend,
    },
  } as unknown as BrowserWindow;
}

describe('createTray', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should set tooltip to Abe Stack', () => {
    const mainWindow = createMockWindow();
    createTray(mainWindow);

    expect(mocks.traySetToolTip).toHaveBeenCalledWith('Abe Stack');
  });

  it('should set a context menu', () => {
    const mainWindow = createMockWindow();
    createTray(mainWindow);

    expect(mocks.menuBuildFromTemplate).toHaveBeenCalledTimes(1);
    expect(mocks.traySetContextMenu).toHaveBeenCalledTimes(1);
  });

  it('should include Show/Hide, Open Dashboard, separator, and Quit in context menu', () => {
    const mainWindow = createMockWindow();
    createTray(mainWindow);

    const template = mocks.menuBuildFromTemplate.mock.calls[0]![0] as MenuItemConstructorOptions[];
    const labels = template.map((item) => item.label ?? item.type);

    expect(labels).toContain('Show / Hide Window');
    expect(labels).toContain('Open Dashboard');
    expect(labels).toContain('separator');
    expect(labels).toContain('Quit');
  });

  it('should register click handler on tray', () => {
    const mainWindow = createMockWindow();
    createTray(mainWindow);

    expect(mocks.trayOn).toHaveBeenCalledWith('click', expect.any(Function));
  });

  describe('Show / Hide context menu item', () => {
    it('should hide window when visible', () => {
      const mainWindow = createMockWindow();
      mocks.isVisible.mockReturnValue(true);
      createTray(mainWindow);

      const template =
        mocks.menuBuildFromTemplate.mock.calls[0]![0] as MenuItemConstructorOptions[];
      const showHideItem = template.find((item) => item.label === 'Show / Hide Window')!;
      (showHideItem.click as () => void)();

      expect(mocks.hide).toHaveBeenCalledTimes(1);
    });

    it('should show and focus window when not visible', () => {
      const mainWindow = createMockWindow();
      mocks.isVisible.mockReturnValue(false);
      createTray(mainWindow);

      const template =
        mocks.menuBuildFromTemplate.mock.calls[0]![0] as MenuItemConstructorOptions[];
      const showHideItem = template.find((item) => item.label === 'Show / Hide Window')!;
      (showHideItem.click as () => void)();

      expect(mocks.show).toHaveBeenCalledTimes(1);
      expect(mocks.focus).toHaveBeenCalledTimes(1);
    });
  });

  describe('Open Dashboard context menu item', () => {
    it('should show window and send deep-link-navigation', () => {
      const mainWindow = createMockWindow();
      createTray(mainWindow);

      const template =
        mocks.menuBuildFromTemplate.mock.calls[0]![0] as MenuItemConstructorOptions[];
      const dashboardItem = template.find((item) => item.label === 'Open Dashboard')!;
      (dashboardItem.click as () => void)();

      expect(mocks.show).toHaveBeenCalled();
      expect(mocks.focus).toHaveBeenCalled();
      expect(mocks.webContentsSend).toHaveBeenCalledWith('deep-link-navigation', {
        path: '/dashboard',
        query: {},
      });
    });
  });

  describe('Quit context menu item', () => {
    it('should call app.quit', () => {
      const mainWindow = createMockWindow();
      createTray(mainWindow);

      const template =
        mocks.menuBuildFromTemplate.mock.calls[0]![0] as MenuItemConstructorOptions[];
      const quitItem = template.find((item) => item.label === 'Quit')!;
      (quitItem.click as () => void)();

      expect(mocks.appQuit).toHaveBeenCalledTimes(1);
    });
  });

  describe('tray click handler', () => {
    it('should hide window when visible on click', () => {
      const mainWindow = createMockWindow();
      mocks.isVisible.mockReturnValue(true);
      createTray(mainWindow);

      const clickHandler = mocks.trayOn.mock.calls.find(
        (call) => call[0] === 'click',
      )![1] as () => void;
      clickHandler();

      expect(mocks.hide).toHaveBeenCalledTimes(1);
    });

    it('should show and focus window when hidden on click', () => {
      const mainWindow = createMockWindow();
      mocks.isVisible.mockReturnValue(false);
      createTray(mainWindow);

      const clickHandler = mocks.trayOn.mock.calls.find(
        (call) => call[0] === 'click',
      )![1] as () => void;
      clickHandler();

      expect(mocks.show).toHaveBeenCalledTimes(1);
      expect(mocks.focus).toHaveBeenCalledTimes(1);
    });
  });
});
