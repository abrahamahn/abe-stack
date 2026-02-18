// main/apps/desktop/src/__tests__/integration.test.ts
/**
 * Integration Tests for Electron Desktop App
 *
 * These tests verify the integration between different components:
 * - Main process and IPC handlers
 * - Window creation and management
 * - Preload script and context bridge
 * - App lifecycle events
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { NativeBridge } from '@bslt/shared';

// ============================================================================
// Shared Mock Setup using vi.hoisted
// ============================================================================

const integrationMocks = vi.hoisted(() => {
  // IPC tracking for integration verification
  const ipcHandlers = new Map<string, (...args: unknown[]) => unknown>();
  const ipcListeners = new Map<string, (...args: unknown[]) => void>();
  const invokedChannels: Array<{ channel: string; args: unknown[] }> = [];
  const sentChannels: Array<{ channel: string; args: unknown[] }> = [];

  // Window tracking
  const windowEvents = new Map<string, ((...args: unknown[]) => void)[]>();
  let windowInstance: MockBrowserWindow | null = null;

  // Notification tracking
  const shownNotifications: Array<{ title: string; body: string }> = [];

  // Helper to set the window instance from constructor
  const setCurrentWindow = (instance: MockBrowserWindow) => {
    windowInstance = instance;
  };

  // Mock BrowserWindow class
  class MockBrowserWindow {
    options: unknown;
    webContents = { id: 1, openDevTools: vi.fn(), send: vi.fn() };
    id = 1;

    constructor(options: unknown) {
      this.options = options;
      setCurrentWindow(this);
    }

    loadURL = vi.fn().mockResolvedValue(undefined);
    loadFile = vi.fn().mockResolvedValue(undefined);

    on(event: string, callback: (...args: unknown[]) => void) {
      const handlers = windowEvents.get(event) ?? [];
      handlers.push(callback);
      windowEvents.set(event, handlers);
    }

    emit(event: string, ...args: unknown[]) {
      const handlers = windowEvents.get(event) ?? [];
      handlers.forEach((handler) => {
        handler(...args);
      });
    }

    close = vi.fn();
    destroy = vi.fn();
    focus = vi.fn();
    show = vi.fn();
    hide = vi.fn();
    minimize = vi.fn();
    maximize = vi.fn();
    restore = vi.fn();
    isMaximized = vi.fn().mockReturnValue(false);
    isMinimized = vi.fn().mockReturnValue(false);
    isDestroyed = vi.fn().mockReturnValue(false);
    isVisible = vi.fn().mockReturnValue(true);
    getBounds = vi.fn().mockReturnValue({ x: 0, y: 0, width: 1200, height: 800 });
    setBounds = vi.fn();
    setTitle = vi.fn();
    getTitle = vi.fn().mockReturnValue('Abe Stack');
  }

  return {
    ipcHandlers,
    ipcListeners,
    invokedChannels,
    sentChannels,
    windowEvents,
    shownNotifications,
    MockBrowserWindow,
    getWindowInstance: () => windowInstance,
    setWindowInstance: (w: MockBrowserWindow | null) => {
      windowInstance = w;
    },
    clearAll: () => {
      ipcHandlers.clear();
      ipcListeners.clear();
      invokedChannels.length = 0;
      sentChannels.length = 0;
      windowEvents.clear();
      shownNotifications.length = 0;
      windowInstance = null;
    },
  };
});

// ============================================================================
// Shared Mock Objects
// ============================================================================

/**
 * Mock nativeTheme object used across all electron mocks.
 * Provides default theme detection without requiring actual electron.
 */
const mockNativeTheme = {
  themeSource: 'system' as const,
  shouldUseDarkColors: false,
};

// ============================================================================
// Integration Test Suite: End-to-End IPC Flow
// ============================================================================

describe('Integration: End-to-End IPC Flow', () => {
  // App event handlers storage
  const appEventHandlers = new Map<string, ((...args: unknown[]) => void)[]>();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    integrationMocks.clearAll();
    appEventHandlers.clear();

    // Mock new desktop modules that main.ts imports
    vi.doMock('../electron/auto-updater', () => ({ initAutoUpdater: vi.fn() }));
    vi.doMock('../electron/deep-links', () => ({
      registerDeepLinkProtocol: vi.fn(),
      handleDeepLink: vi.fn(),
    }));
    vi.doMock('../electron/menu', () => ({ createApplicationMenu: vi.fn() }));
    vi.doMock('../electron/tray', () => ({ createTray: vi.fn() }));

    // Mock electron module with full integration support
    vi.doMock('electron', () => ({
      app: {
        getVersion: vi.fn().mockReturnValue('2.0.0'),
        disableHardwareAcceleration: vi.fn(),
        quit: vi.fn(),
        requestSingleInstanceLock: vi.fn().mockReturnValue(true),
        isDefaultProtocolClient: vi.fn().mockReturnValue(true),
        setAsDefaultProtocolClient: vi.fn().mockReturnValue(true),
        on: vi.fn((event: string, handler: (...args: unknown[]) => void) => {
          const handlers = appEventHandlers.get(event) ?? [];
          handlers.push(handler);
          appEventHandlers.set(event, handlers);
        }),
      },
      BrowserWindow: integrationMocks.MockBrowserWindow,
      nativeTheme: mockNativeTheme,
      dialog: {
        showOpenDialog: vi.fn().mockResolvedValue({
          canceled: false,
          filePaths: ['/integration/test/file.txt'],
        }),
        showSaveDialog: vi.fn().mockResolvedValue({
          canceled: false,
          filePath: '/integration/test/saved.txt',
        }),
      },
      ipcMain: {
        handle: vi.fn((channel: string, handler: (...args: unknown[]) => unknown) => {
          integrationMocks.ipcHandlers.set(channel, handler);
        }),
        on: vi.fn((channel: string, listener: (...args: unknown[]) => void) => {
          integrationMocks.ipcListeners.set(channel, listener);
        }),
      },
      ipcRenderer: {
        invoke: vi.fn((channel: string, ...args: unknown[]) => {
          integrationMocks.invokedChannels.push({ channel, args });
          const handler = integrationMocks.ipcHandlers.get(channel);
          if (handler !== undefined) {
            return Promise.resolve(handler(null, ...args));
          }
          return Promise.reject(new Error(`No handler for channel: ${channel}`));
        }),
        send: vi.fn((channel: string, ...args: unknown[]) => {
          integrationMocks.sentChannels.push({ channel, args });
          const listener = integrationMocks.ipcListeners.get(channel);
          if (listener !== undefined) {
            listener(null, ...args);
          }
        }),
      },
      contextBridge: {
        exposeInMainWorld: vi.fn(),
      },
      shell: {
        openExternal: vi.fn().mockResolvedValue(undefined),
      },
      Notification: class MockNotification {
        title: string;
        body: string;
        constructor({ title, body }: { title: string; body: string }) {
          this.title = title;
          this.body = body;
        }
        show() {
          integrationMocks.shownNotifications.push({ title: this.title, body: this.body });
        }
        static isSupported = vi.fn().mockReturnValue(true);
      },
    }));

    // Mock path module
    vi.doMock('path', () => ({
      join: vi.fn((...args: string[]) => args.join('/')),
      default: {
        join: vi.fn((...args: string[]) => args.join('/')),
      },
    }));

    // Mock @bslt/shared which exports waitForPort
    vi.doMock('@bslt/shared', () => ({
      waitForPort: vi.fn().mockResolvedValue(5174),
    }));
  });

  afterEach(() => {
    vi.doUnmock('electron');
    vi.doUnmock('path');
    vi.doUnmock('@bslt/shared');
  });

  describe('IPC handler registration and invocation flow', () => {
    it('should register all handlers when IPC module is initialized', async () => {
      // Import the handlers module
      const { registerIPCHandlers } = await import('../electron/ipc/handlers');

      // Register handlers with a mock window getter
      const mockWindow = new integrationMocks.MockBrowserWindow({});
      registerIPCHandlers(() => mockWindow as unknown as import('electron').BrowserWindow);

      // Verify all handlers are registered
      expect(integrationMocks.ipcHandlers.has('get-app-version')).toBe(true);
      expect(integrationMocks.ipcHandlers.has('show-open-dialog')).toBe(true);
      expect(integrationMocks.ipcHandlers.has('show-save-dialog')).toBe(true);
      expect(integrationMocks.ipcListeners.has('show-notification')).toBe(true);
    });

    it('should correctly invoke get-app-version through IPC flow', async () => {
      const { registerIPCHandlers } = await import('../electron/ipc/handlers');
      const mockWindow = new integrationMocks.MockBrowserWindow({});
      registerIPCHandlers(() => mockWindow as unknown as import('electron').BrowserWindow);

      // Simulate renderer invoking the handler
      const { ipcRenderer } = await import('electron');
      const version = await ipcRenderer.invoke('get-app-version');

      expect(version).toBe('2.0.0');
      expect(integrationMocks.invokedChannels).toContainEqual({
        channel: 'get-app-version',
        args: [],
      });
    });

    it('should flow open dialog request through IPC correctly', async () => {
      const { registerIPCHandlers } = await import('../electron/ipc/handlers');
      const mockWindow = new integrationMocks.MockBrowserWindow({});
      registerIPCHandlers(() => mockWindow as unknown as import('electron').BrowserWindow);

      const { ipcRenderer } = await import('electron');
      const options = {
        title: 'Integration Test Open',
        filters: [{ name: 'Text', extensions: ['txt'] }],
        multiple: false,
      };

      const result = await ipcRenderer.invoke('show-open-dialog', options);

      expect(result).toEqual(['/integration/test/file.txt']);
      expect(integrationMocks.invokedChannels).toContainEqual({
        channel: 'show-open-dialog',
        args: [options],
      });
    });

    it('should flow save dialog request through IPC correctly', async () => {
      const { registerIPCHandlers } = await import('../electron/ipc/handlers');
      const mockWindow = new integrationMocks.MockBrowserWindow({});
      registerIPCHandlers(() => mockWindow as unknown as import('electron').BrowserWindow);

      const { ipcRenderer } = await import('electron');
      const options = {
        title: 'Integration Test Save',
        defaultPath: '/default/path.txt',
      };

      const result = await ipcRenderer.invoke('show-save-dialog', options);

      expect(result).toBe('/integration/test/saved.txt');
      expect(integrationMocks.invokedChannels).toContainEqual({
        channel: 'show-save-dialog',
        args: [options],
      });
    });

    it('should flow notification through IPC and create Notification', async () => {
      const { registerIPCHandlers } = await import('../electron/ipc/handlers');
      const mockWindow = new integrationMocks.MockBrowserWindow({});
      registerIPCHandlers(() => mockWindow as unknown as import('electron').BrowserWindow);

      const { ipcRenderer } = await import('electron');
      ipcRenderer.send('show-notification', {
        title: 'Integration Title',
        body: 'Integration Body',
      });

      expect(integrationMocks.sentChannels).toContainEqual({
        channel: 'show-notification',
        args: [{ title: 'Integration Title', body: 'Integration Body' }],
      });
      expect(integrationMocks.shownNotifications).toContainEqual({
        title: 'Integration Title',
        body: 'Integration Body',
      });
    });
  });

  describe('Window creation and IPC handler coordination', () => {
    it('should create window with correct security settings', async () => {
      process.env['NODE_ENV'] = 'production';

      await import('../electron/main');

      // Trigger the ready event
      const readyHandlers = appEventHandlers.get('ready') ?? [];
      expect(readyHandlers.length).toBeGreaterThan(0);
      await (readyHandlers[0] as () => Promise<void>)();

      const windowInstance = integrationMocks.getWindowInstance();
      expect(windowInstance).not.toBeNull();
      expect(windowInstance!).toBeDefined();
      expect(windowInstance!.options).toMatchObject({
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true,
          sandbox: true,
        },
      });

      delete process.env['NODE_ENV'];
    });

    it('should coordinate window getter with IPC handlers', async () => {
      process.env['NODE_ENV'] = 'production';

      await import('../electron/main');

      // Before window creation, IPC handlers should have been registered
      expect(integrationMocks.ipcHandlers.has('get-app-version')).toBe(true);

      // Create window
      const readyHandlers = appEventHandlers.get('ready') ?? [];
      await (readyHandlers[0] as () => Promise<void>)();

      // Now the window getter should return the window
      const windowInstance = integrationMocks.getWindowInstance();
      expect(windowInstance).not.toBeNull();

      delete process.env['NODE_ENV'];
    });
  });
});

// ============================================================================
// Integration Test Suite: Window Lifecycle
// ============================================================================

describe('Integration: Window Lifecycle Management', () => {
  const appEventHandlers = new Map<string, ((...args: unknown[]) => void)[]>();
  let appQuitMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    integrationMocks.clearAll();
    appEventHandlers.clear();
    appQuitMock = vi.fn();

    // Mock new desktop modules that main.ts imports
    vi.doMock('../electron/auto-updater', () => ({ initAutoUpdater: vi.fn() }));
    vi.doMock('../electron/deep-links', () => ({
      registerDeepLinkProtocol: vi.fn(),
      handleDeepLink: vi.fn(),
    }));
    vi.doMock('../electron/menu', () => ({ createApplicationMenu: vi.fn() }));
    vi.doMock('../electron/tray', () => ({ createTray: vi.fn() }));

    vi.doMock('electron', () => ({
      app: {
        getVersion: vi.fn().mockReturnValue('1.0.0'),
        disableHardwareAcceleration: vi.fn(),
        quit: appQuitMock,
        requestSingleInstanceLock: vi.fn().mockReturnValue(true),
        isDefaultProtocolClient: vi.fn().mockReturnValue(true),
        setAsDefaultProtocolClient: vi.fn().mockReturnValue(true),
        on: vi.fn((event: string, handler: (...args: unknown[]) => void) => {
          const handlers = appEventHandlers.get(event) ?? [];
          handlers.push(handler);
          appEventHandlers.set(event, handlers);
        }),
      },
      BrowserWindow: integrationMocks.MockBrowserWindow,
      nativeTheme: mockNativeTheme,
      dialog: {
        showOpenDialog: vi.fn().mockResolvedValue({ canceled: false, filePaths: [] }),
        showSaveDialog: vi.fn().mockResolvedValue({ canceled: false, filePath: '' }),
      },
      ipcMain: {
        handle: vi.fn(),
        on: vi.fn(),
      },
      Notification: class {
        show() {}
        static isSupported = vi.fn().mockReturnValue(true);
      },
    }));

    vi.doMock('path', () => ({
      join: vi.fn((...args: string[]) => args.join('/')),
      default: {
        join: vi.fn((...args: string[]) => args.join('/')),
      },
    }));

    vi.doMock('@bslt/shared', () => ({
      waitForPort: vi.fn().mockResolvedValue(5174),
    }));
  });

  afterEach(() => {
    vi.doUnmock('electron');
    vi.doUnmock('path');
    vi.doUnmock('@bslt/shared');
  });

  describe('Window creation lifecycle', () => {
    it('should create window on app ready event', async () => {
      process.env['NODE_ENV'] = 'development';

      await import('../electron/main');

      expect(integrationMocks.getWindowInstance()).toBeNull();

      const readyHandlers = appEventHandlers.get('ready') ?? [];
      await (readyHandlers[0] as () => Promise<void>)();

      expect(integrationMocks.getWindowInstance()).not.toBeNull();

      delete process.env['NODE_ENV'];
    });

    it('should load development URL in development mode', async () => {
      process.env['NODE_ENV'] = 'development';

      await import('../electron/main');

      const readyHandlers = appEventHandlers.get('ready') ?? [];
      await (readyHandlers[0] as () => Promise<void>)();

      const windowInstance = integrationMocks.getWindowInstance();
      expect(windowInstance!.loadURL).toHaveBeenCalledWith('http://localhost:5174');

      delete process.env['NODE_ENV'];
    });

    it('should load file in production mode', async () => {
      process.env['NODE_ENV'] = 'production';

      await import('../electron/main');

      const readyHandlers = appEventHandlers.get('ready') ?? [];
      await (readyHandlers[0] as () => Promise<void>)();

      const windowInstance = integrationMocks.getWindowInstance();
      expect(windowInstance!.loadFile).toHaveBeenCalled();
      expect(windowInstance!.loadURL).not.toHaveBeenCalled();

      delete process.env['NODE_ENV'];
    });
  });

  describe('Window close lifecycle', () => {
    it('should create window that will handle closed event', async () => {
      process.env['NODE_ENV'] = 'development';

      await import('../electron/main');

      // Create window
      const readyHandlers = appEventHandlers.get('ready') ?? [];
      await (readyHandlers[0] as () => Promise<void>)();

      const windowInstance = integrationMocks.getWindowInstance();
      expect(windowInstance).not.toBeNull();

      // The window is created and can handle lifecycle events
      // The closed event is registered in the main.ts code
      // We verify the window exists and has the expected structure
      expect(typeof windowInstance!.loadURL).toBe('function');
      expect(typeof windowInstance!.loadFile).toBe('function');

      delete process.env['NODE_ENV'];
    });

    it('should quit app on window-all-closed for non-darwin platforms', async () => {
      const originalPlatform = process.platform;
      Object.defineProperty(process, 'platform', { value: 'win32' });
      process.env['NODE_ENV'] = 'development';

      await import('../electron/main');

      const windowAllClosedHandlers = appEventHandlers.get('window-all-closed') ?? [];
      expect(windowAllClosedHandlers.length).toBeGreaterThan(0);
      const handler = windowAllClosedHandlers[0];
      handler?.();

      expect(appQuitMock).toHaveBeenCalledTimes(1);

      Object.defineProperty(process, 'platform', { value: originalPlatform });
      delete process.env['NODE_ENV'];
    });

    it('should not quit app on window-all-closed for darwin platform', async () => {
      const originalPlatform = process.platform;
      Object.defineProperty(process, 'platform', { value: 'darwin' });
      process.env['NODE_ENV'] = 'development';

      await import('../electron/main');

      const windowAllClosedHandlers = appEventHandlers.get('window-all-closed') ?? [];
      expect(windowAllClosedHandlers.length).toBeGreaterThan(0);
      const handler = windowAllClosedHandlers[0];
      handler?.();

      expect(appQuitMock).not.toHaveBeenCalled();

      Object.defineProperty(process, 'platform', { value: originalPlatform });
      delete process.env['NODE_ENV'];
    });
  });

  describe('App activate lifecycle', () => {
    it('should register activate event handler on app', async () => {
      process.env['NODE_ENV'] = 'development';

      await import('../electron/main');

      // Verify that activate handler was registered
      const activateHandlers = appEventHandlers.get('activate') ?? [];
      expect(activateHandlers.length).toBeGreaterThan(0);

      delete process.env['NODE_ENV'];
    });

    it('should have activate handler that is a function', async () => {
      process.env['NODE_ENV'] = 'development';

      await import('../electron/main');

      const activateHandlers = appEventHandlers.get('activate') ?? [];
      expect(typeof activateHandlers[0]).toBe('function');

      delete process.env['NODE_ENV'];
    });
  });
});

// ============================================================================
// Integration Test Suite: Preload Script and Context Bridge
// ============================================================================

describe('Integration: Preload Script Context Bridge', () => {
  let exposedAPI: NativeBridge;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    integrationMocks.clearAll();

    const mockExposeInMainWorld = vi.fn((name: string, api: NativeBridge) => {
      if (name === 'electronAPI') {
        exposedAPI = api;
      }
    });

    vi.doMock('electron', () => ({
      app: {
        getVersion: vi.fn().mockReturnValue('3.0.0'),
      },
      contextBridge: {
        exposeInMainWorld: mockExposeInMainWorld,
      },
      ipcRenderer: {
        invoke: vi.fn((channel: string, ...args: unknown[]) => {
          integrationMocks.invokedChannels.push({ channel, args });
          if (channel === 'get-app-version') {
            return Promise.resolve('3.0.0');
          }
          if (channel === 'show-open-dialog') {
            return Promise.resolve(['/preload/test.txt']);
          }
          if (channel === 'show-save-dialog') {
            return Promise.resolve('/preload/saved.txt');
          }
          return Promise.resolve(null);
        }),
        send: vi.fn((channel: string, ...args: unknown[]) => {
          integrationMocks.sentChannels.push({ channel, args });
        }),
      },
      shell: {
        openExternal: vi.fn().mockResolvedValue(undefined),
      },
    }));
  });

  afterEach(() => {
    vi.doUnmock('electron');
  });

  describe('Context bridge API exposure', () => {
    it('should expose all NativeBridge methods', async () => {
      await import('../electron/preload');

      expect(exposedAPI).toBeDefined();
      expect(typeof exposedAPI.getPlatform).toBe('function');
      expect(typeof exposedAPI.sendNotification).toBe('function');
      expect(typeof exposedAPI.isNative).toBe('function');
      expect(typeof exposedAPI.getAppVersion).toBe('function');
      expect(typeof exposedAPI.openExternal).toBe('function');
      expect(typeof exposedAPI.showOpenDialog).toBe('function');
      expect(typeof exposedAPI.showSaveDialog).toBe('function');
    });
  });

  describe('Exposed API functionality', () => {
    beforeEach(async () => {
      await import('../electron/preload');
    });

    it('getPlatform should return electron', async () => {
      const platform = await exposedAPI.getPlatform();
      expect(platform).toBe('electron');
    });

    it('isNative should return true', () => {
      const isNative = exposedAPI.isNative();
      expect(isNative).toBe(true);
    });

    it('getAppVersion should invoke IPC and return version', async () => {
      const version = await exposedAPI.getAppVersion();

      expect(version).toBe('3.0.0');
      expect(integrationMocks.invokedChannels).toContainEqual({
        channel: 'get-app-version',
        args: [],
      });
    });

    it('sendNotification should send via IPC', () => {
      exposedAPI.sendNotification('Test Title', 'Test Body');

      expect(integrationMocks.sentChannels).toContainEqual({
        channel: 'show-notification',
        args: [{ title: 'Test Title', body: 'Test Body' }],
      });
    });

    it('openExternal should call shell.openExternal', async () => {
      const { shell } = await import('electron');

      await exposedAPI.openExternal('https://example.com');

      expect(shell.openExternal).toHaveBeenCalledWith('https://example.com');
    });

    it('showOpenDialog should invoke IPC with options', async () => {
      const options = {
        title: 'Test Open',
        filters: [{ name: 'All', extensions: ['*'] }],
      };

      const result = await exposedAPI.showOpenDialog!(options);

      expect(result).toEqual(['/preload/test.txt']);
      expect(integrationMocks.invokedChannels).toContainEqual({
        channel: 'show-open-dialog',
        args: [options],
      });
    });

    it('showSaveDialog should invoke IPC with options', async () => {
      const options = {
        title: 'Test Save',
        defaultPath: '/default.txt',
      };

      const result = await exposedAPI.showSaveDialog!(options);

      expect(result).toBe('/preload/saved.txt');
      expect(integrationMocks.invokedChannels).toContainEqual({
        channel: 'show-save-dialog',
        args: [options],
      });
    });
  });
});

// ============================================================================
// Integration Test Suite: App Initialization and Shutdown
// ============================================================================

describe('Integration: App Initialization and Shutdown', () => {
  const appEventHandlers = new Map<string, ((...args: unknown[]) => void)[]>();
  let disableHardwareAccelerationMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    integrationMocks.clearAll();
    appEventHandlers.clear();
    disableHardwareAccelerationMock = vi.fn();

    // Mock new desktop modules that main.ts imports
    vi.doMock('../electron/auto-updater', () => ({ initAutoUpdater: vi.fn() }));
    vi.doMock('../electron/deep-links', () => ({
      registerDeepLinkProtocol: vi.fn(),
      handleDeepLink: vi.fn(),
    }));
    vi.doMock('../electron/menu', () => ({ createApplicationMenu: vi.fn() }));
    vi.doMock('../electron/tray', () => ({ createTray: vi.fn() }));

    vi.doMock('electron', () => ({
      app: {
        getVersion: vi.fn().mockReturnValue('1.0.0'),
        disableHardwareAcceleration: disableHardwareAccelerationMock,
        quit: vi.fn(),
        requestSingleInstanceLock: vi.fn().mockReturnValue(true),
        isDefaultProtocolClient: vi.fn().mockReturnValue(true),
        setAsDefaultProtocolClient: vi.fn().mockReturnValue(true),
        on: vi.fn((event: string, handler: (...args: unknown[]) => void) => {
          const handlers = appEventHandlers.get(event) ?? [];
          handlers.push(handler);
          appEventHandlers.set(event, handlers);
        }),
      },
      BrowserWindow: integrationMocks.MockBrowserWindow,
      nativeTheme: mockNativeTheme,
      dialog: {
        showOpenDialog: vi.fn().mockResolvedValue({ canceled: false, filePaths: [] }),
        showSaveDialog: vi.fn().mockResolvedValue({ canceled: false, filePath: '' }),
      },
      ipcMain: {
        handle: vi.fn((channel: string, handler: (...args: unknown[]) => unknown) => {
          integrationMocks.ipcHandlers.set(channel, handler);
        }),
        on: vi.fn((channel: string, listener: (...args: unknown[]) => void) => {
          integrationMocks.ipcListeners.set(channel, listener);
        }),
      },
      Notification: class {
        show() {}
        static isSupported = vi.fn().mockReturnValue(true);
      },
    }));

    vi.doMock('path', () => ({
      join: vi.fn((...args: string[]) => args.join('/')),
      default: {
        join: vi.fn((...args: string[]) => args.join('/')),
      },
    }));

    vi.doMock('@bslt/shared', () => ({
      waitForPort: vi.fn().mockResolvedValue(5174),
    }));
  });

  afterEach(() => {
    vi.doUnmock('electron');
    vi.doUnmock('path');
    vi.doUnmock('@bslt/shared');
  });

  describe('App initialization sequence', () => {
    it('should disable hardware acceleration before any other setup', async () => {
      await import('../electron/main');

      // Hardware acceleration should be disabled immediately on module load
      expect(disableHardwareAccelerationMock).toHaveBeenCalledTimes(1);
    });

    it('should register IPC handlers before window creation', async () => {
      await import('../electron/main');

      // IPC handlers should be registered during module initialization
      expect(integrationMocks.ipcHandlers.has('get-app-version')).toBe(true);
      expect(integrationMocks.ipcHandlers.has('show-open-dialog')).toBe(true);
      expect(integrationMocks.ipcHandlers.has('show-save-dialog')).toBe(true);

      // Window should not exist yet (only created on 'ready' event)
      expect(integrationMocks.getWindowInstance()).toBeNull();
    });

    it('should register all app lifecycle event handlers', async () => {
      await import('../electron/main');

      expect(appEventHandlers.has('ready')).toBe(true);
      expect(appEventHandlers.has('window-all-closed')).toBe(true);
      expect(appEventHandlers.has('activate')).toBe(true);
    });

    it('should complete full initialization flow', async () => {
      process.env['NODE_ENV'] = 'development';

      await import('../electron/main');

      // Step 1: Hardware acceleration disabled
      expect(disableHardwareAccelerationMock).toHaveBeenCalled();

      // Step 2: IPC handlers registered
      expect(integrationMocks.ipcHandlers.size).toBeGreaterThan(0);

      // Step 3: Event handlers registered
      // ready, window-all-closed, activate, open-url, second-instance
      expect(appEventHandlers.size).toBe(5);

      // Step 4: Trigger ready event - window created
      const readyHandlers = appEventHandlers.get('ready') ?? [];
      await (readyHandlers[0] as () => Promise<void>)();

      expect(integrationMocks.getWindowInstance()).not.toBeNull();

      delete process.env['NODE_ENV'];
    });
  });

  describe('Custom port configuration', () => {
    it('should respect DESKTOP_RENDERER_PORT environment variable', async () => {
      process.env['NODE_ENV'] = 'development';
      process.env['DESKTOP_RENDERER_PORT'] = '3000';

      const waitForPortMock = vi.fn().mockResolvedValue(3000);

      // Clear all mocks and reset modules first
      vi.doUnmock('electron');
      vi.doUnmock('path');
      vi.doUnmock('@bslt/shared');
      vi.resetModules();
      appEventHandlers.clear();
      integrationMocks.clearAll();

      // Re-apply all mocks with custom waitForPort
      vi.doMock('../electron/auto-updater', () => ({ initAutoUpdater: vi.fn() }));
      vi.doMock('../electron/deep-links', () => ({
        registerDeepLinkProtocol: vi.fn(),
        handleDeepLink: vi.fn(),
      }));
      vi.doMock('../electron/menu', () => ({ createApplicationMenu: vi.fn() }));
      vi.doMock('../electron/tray', () => ({ createTray: vi.fn() }));

      vi.doMock('electron', () => ({
        app: {
          getVersion: vi.fn().mockReturnValue('1.0.0'),
          disableHardwareAcceleration: disableHardwareAccelerationMock,
          quit: vi.fn(),
          requestSingleInstanceLock: vi.fn().mockReturnValue(true),
          isDefaultProtocolClient: vi.fn().mockReturnValue(true),
          setAsDefaultProtocolClient: vi.fn().mockReturnValue(true),
          on: vi.fn((event: string, handler: (...args: unknown[]) => void) => {
            const handlers = appEventHandlers.get(event) ?? [];
            handlers.push(handler);
            appEventHandlers.set(event, handlers);
          }),
        },
        BrowserWindow: integrationMocks.MockBrowserWindow,
        nativeTheme: mockNativeTheme,
        dialog: {
          showOpenDialog: vi.fn().mockResolvedValue({ canceled: false, filePaths: [] }),
          showSaveDialog: vi.fn().mockResolvedValue({ canceled: false, filePath: '' }),
        },
        ipcMain: {
          handle: vi.fn((channel: string, handler: (...args: unknown[]) => unknown) => {
            integrationMocks.ipcHandlers.set(channel, handler);
          }),
          on: vi.fn((channel: string, listener: (...args: unknown[]) => void) => {
            integrationMocks.ipcListeners.set(channel, listener);
          }),
        },
        Notification: class {
          show() {}
          static isSupported = vi.fn().mockReturnValue(true);
        },
      }));

      vi.doMock('path', () => ({
        join: vi.fn((...args: string[]) => args.join('/')),
        default: {
          join: vi.fn((...args: string[]) => args.join('/')),
        },
      }));

      vi.doMock('@bslt/shared', () => ({
        waitForPort: waitForPortMock,
      }));

      await import('../electron/main');

      const readyHandlers = appEventHandlers.get('ready') ?? [];
      await (readyHandlers[0] as () => Promise<void>)();

      expect(waitForPortMock).toHaveBeenCalledWith(expect.arrayContaining([3000]), 'localhost');

      const windowInstance = integrationMocks.getWindowInstance();
      expect(windowInstance!.loadURL).toHaveBeenCalledWith('http://localhost:3000');

      delete process.env['NODE_ENV'];
      delete process.env['DESKTOP_RENDERER_PORT'];
    });

    it('should respect VITE_PORT environment variable as fallback', async () => {
      process.env['NODE_ENV'] = 'development';
      process.env['VITE_PORT'] = '4000';

      const waitForPortMock = vi.fn().mockResolvedValue(4000);

      // Clear all mocks and reset modules first
      vi.doUnmock('electron');
      vi.doUnmock('path');
      vi.doUnmock('@bslt/shared');
      vi.resetModules();
      appEventHandlers.clear();
      integrationMocks.clearAll();

      // Re-apply all mocks with custom waitForPort
      vi.doMock('../electron/auto-updater', () => ({ initAutoUpdater: vi.fn() }));
      vi.doMock('../electron/deep-links', () => ({
        registerDeepLinkProtocol: vi.fn(),
        handleDeepLink: vi.fn(),
      }));
      vi.doMock('../electron/menu', () => ({ createApplicationMenu: vi.fn() }));
      vi.doMock('../electron/tray', () => ({ createTray: vi.fn() }));

      vi.doMock('electron', () => ({
        app: {
          getVersion: vi.fn().mockReturnValue('1.0.0'),
          disableHardwareAcceleration: disableHardwareAccelerationMock,
          quit: vi.fn(),
          requestSingleInstanceLock: vi.fn().mockReturnValue(true),
          isDefaultProtocolClient: vi.fn().mockReturnValue(true),
          setAsDefaultProtocolClient: vi.fn().mockReturnValue(true),
          on: vi.fn((event: string, handler: (...args: unknown[]) => void) => {
            const handlers = appEventHandlers.get(event) ?? [];
            handlers.push(handler);
            appEventHandlers.set(event, handlers);
          }),
        },
        BrowserWindow: integrationMocks.MockBrowserWindow,
        nativeTheme: mockNativeTheme,
        dialog: {
          showOpenDialog: vi.fn().mockResolvedValue({ canceled: false, filePaths: [] }),
          showSaveDialog: vi.fn().mockResolvedValue({ canceled: false, filePath: '' }),
        },
        ipcMain: {
          handle: vi.fn((channel: string, handler: (...args: unknown[]) => unknown) => {
            integrationMocks.ipcHandlers.set(channel, handler);
          }),
          on: vi.fn((channel: string, listener: (...args: unknown[]) => void) => {
            integrationMocks.ipcListeners.set(channel, listener);
          }),
        },
        Notification: class {
          show() {}
          static isSupported = vi.fn().mockReturnValue(true);
        },
      }));

      vi.doMock('path', () => ({
        join: vi.fn((...args: string[]) => args.join('/')),
        default: {
          join: vi.fn((...args: string[]) => args.join('/')),
        },
      }));

      vi.doMock('@bslt/shared', () => ({
        waitForPort: waitForPortMock,
      }));

      await import('../electron/main');

      const readyHandlers = appEventHandlers.get('ready') ?? [];
      await (readyHandlers[0] as () => Promise<void>)();

      expect(waitForPortMock).toHaveBeenCalledWith(expect.arrayContaining([4000]), 'localhost');

      delete process.env['NODE_ENV'];
      delete process.env['VITE_PORT'];
    });
  });
});

// ============================================================================
// Integration Test Suite: Error Handling
// ============================================================================

describe('Integration: Error Handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    integrationMocks.clearAll();
  });

  afterEach(() => {
    vi.doUnmock('electron');
  });

  describe('IPC error handling', () => {
    it('should handle dialog errors gracefully', async () => {
      const mockError = new Error('Dialog error');

      vi.doMock('electron', () => ({
        app: {
          getVersion: vi.fn().mockReturnValue('1.0.0'),
        },
        dialog: {
          showOpenDialog: vi.fn().mockRejectedValue(mockError),
          showSaveDialog: vi.fn().mockRejectedValue(mockError),
        },
        ipcMain: {
          handle: vi.fn((channel: string, handler: (...args: unknown[]) => unknown) => {
            integrationMocks.ipcHandlers.set(channel, handler);
          }),
          on: vi.fn(),
        },
        Notification: class {
          show() {}
          static isSupported = vi.fn().mockReturnValue(true);
        },
      }));

      const { registerIPCHandlers } = await import('../electron/ipc/handlers');
      const mockWindow = new integrationMocks.MockBrowserWindow({});
      registerIPCHandlers(() => mockWindow as unknown as import('electron').BrowserWindow);

      const handler = integrationMocks.ipcHandlers.get('show-open-dialog')!;

      // The handler should propagate the error
      await expect(handler(null, { title: 'Test' })).rejects.toThrow('Dialog error');
    });

    it('should handle notification when not supported', async () => {
      const notificationShowMock = vi.fn();

      vi.doMock('electron', () => ({
        app: {
          getVersion: vi.fn().mockReturnValue('1.0.0'),
        },
        dialog: {
          showOpenDialog: vi.fn(),
          showSaveDialog: vi.fn(),
        },
        ipcMain: {
          handle: vi.fn(),
          on: vi.fn((channel: string, listener: (...args: unknown[]) => void) => {
            integrationMocks.ipcListeners.set(channel, listener);
          }),
        },
        Notification: class {
          show() {
            notificationShowMock();
          }
          static isSupported = vi.fn().mockReturnValue(false);
        },
      }));

      const { registerIPCHandlers } = await import('../electron/ipc/handlers');
      registerIPCHandlers(() => null);

      const listener = integrationMocks.ipcListeners.get('show-notification')!;
      listener(null, { title: 'Test', body: 'Body' });

      // Notification should not be shown when not supported
      expect(notificationShowMock).not.toHaveBeenCalled();
    });
  });
});

// ============================================================================
// Integration Test Suite: Window Security Settings
// ============================================================================

describe('Integration: Window Security Settings', () => {
  const appEventHandlers = new Map<string, ((...args: unknown[]) => void)[]>();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    integrationMocks.clearAll();
    appEventHandlers.clear();

    // Mock new desktop modules that main.ts imports
    vi.doMock('../electron/auto-updater', () => ({ initAutoUpdater: vi.fn() }));
    vi.doMock('../electron/deep-links', () => ({
      registerDeepLinkProtocol: vi.fn(),
      handleDeepLink: vi.fn(),
    }));
    vi.doMock('../electron/menu', () => ({ createApplicationMenu: vi.fn() }));
    vi.doMock('../electron/tray', () => ({ createTray: vi.fn() }));

    vi.doMock('electron', () => ({
      app: {
        getVersion: vi.fn().mockReturnValue('1.0.0'),
        disableHardwareAcceleration: vi.fn(),
        quit: vi.fn(),
        requestSingleInstanceLock: vi.fn().mockReturnValue(true),
        isDefaultProtocolClient: vi.fn().mockReturnValue(true),
        setAsDefaultProtocolClient: vi.fn().mockReturnValue(true),
        on: vi.fn((event: string, handler: (...args: unknown[]) => void) => {
          const handlers = appEventHandlers.get(event) ?? [];
          handlers.push(handler);
          appEventHandlers.set(event, handlers);
        }),
      },
      BrowserWindow: integrationMocks.MockBrowserWindow,
      nativeTheme: mockNativeTheme,
      dialog: {
        showOpenDialog: vi.fn().mockResolvedValue({ canceled: false, filePaths: [] }),
        showSaveDialog: vi.fn().mockResolvedValue({ canceled: false, filePath: '' }),
      },
      ipcMain: {
        handle: vi.fn(),
        on: vi.fn(),
      },
      Notification: class {
        show() {}
        static isSupported = vi.fn().mockReturnValue(true);
      },
    }));

    vi.doMock('path', () => ({
      join: vi.fn((...args: string[]) => args.join('/')),
      default: {
        join: vi.fn((...args: string[]) => args.join('/')),
      },
    }));

    vi.doMock('@bslt/shared', () => ({
      waitForPort: vi.fn().mockResolvedValue(5174),
    }));
  });

  afterEach(() => {
    vi.doUnmock('electron');
    vi.doUnmock('path');
    vi.doUnmock('@bslt/shared');
  });

  describe('Window webPreferences security', () => {
    it('should disable nodeIntegration for security', async () => {
      process.env['NODE_ENV'] = 'production';

      await import('../electron/main');

      const readyHandlers = appEventHandlers.get('ready') ?? [];
      await (readyHandlers[0] as () => Promise<void>)();

      const windowInstance = integrationMocks.getWindowInstance();
      const options = windowInstance!.options as { webPreferences: { nodeIntegration: boolean } };

      expect(options.webPreferences.nodeIntegration).toBe(false);

      delete process.env['NODE_ENV'];
    });

    it('should enable contextIsolation for security', async () => {
      process.env['NODE_ENV'] = 'production';

      await import('../electron/main');

      const readyHandlers = appEventHandlers.get('ready') ?? [];
      await (readyHandlers[0] as () => Promise<void>)();

      const windowInstance = integrationMocks.getWindowInstance();
      const options = windowInstance!.options as { webPreferences: { contextIsolation: boolean } };

      expect(options.webPreferences.contextIsolation).toBe(true);

      delete process.env['NODE_ENV'];
    });

    it('should enable sandbox for security', async () => {
      process.env['NODE_ENV'] = 'production';

      await import('../electron/main');

      const readyHandlers = appEventHandlers.get('ready') ?? [];
      await (readyHandlers[0] as () => Promise<void>)();

      const windowInstance = integrationMocks.getWindowInstance();
      const options = windowInstance!.options as { webPreferences: { sandbox: boolean } };

      expect(options.webPreferences.sandbox).toBe(true);

      delete process.env['NODE_ENV'];
    });

    it('should set correct preload path', async () => {
      process.env['NODE_ENV'] = 'production';

      await import('../electron/main');

      const readyHandlers = appEventHandlers.get('ready') ?? [];
      await (readyHandlers[0] as () => Promise<void>)();

      const windowInstance = integrationMocks.getWindowInstance();
      const options = windowInstance!.options as { webPreferences: { preload: string } };

      expect(options.webPreferences.preload).toContain('preload.js');

      delete process.env['NODE_ENV'];
    });
  });

  describe('Window dimensions', () => {
    it('should create window with default dimensions', async () => {
      process.env['NODE_ENV'] = 'production';

      await import('../electron/main');

      const readyHandlers = appEventHandlers.get('ready') ?? [];
      await (readyHandlers[0] as () => Promise<void>)();

      const windowInstance = integrationMocks.getWindowInstance();
      const options = windowInstance!.options as { width: number; height: number };

      expect(options.width).toBe(1200);
      expect(options.height).toBe(800);

      delete process.env['NODE_ENV'];
    });
  });
});
