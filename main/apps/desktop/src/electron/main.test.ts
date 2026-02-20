// main/apps/desktop/src/electron/main.test.ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Use vi.hoisted to ensure mocks are available at mock time
const mocks = vi.hoisted(() => {
  const mockLoadURL = vi.fn().mockResolvedValue(undefined);
  const mockLoadFile = vi.fn().mockResolvedValue(undefined);
  const mockWindowOn = vi.fn();
  const mockAppOn = vi.fn();
  const mockAppQuit = vi.fn();
  const mockDisableHardwareAcceleration = vi.fn();
  const mockRegisterIPCHandlers = vi.fn();
  const mockWaitForPort = vi.fn().mockResolvedValue(5174);
  const mockCreateApplicationMenu = vi.fn();
  const mockInitAutoUpdater = vi.fn();
  const mockCreateTray = vi.fn();
  const mockRegisterDeepLinkProtocol = vi.fn();
  const mockHandleDeepLink = vi.fn();
  const mockRequestSingleInstanceLock = vi.fn().mockReturnValue(true);
  const mockIsDefaultProtocolClient = vi.fn().mockReturnValue(true);
  const mockSetAsDefaultProtocolClient = vi.fn().mockReturnValue(true);
  const mockWebContentsOpenDevTools = vi.fn();

  return {
    mockLoadURL,
    mockLoadFile,
    mockWindowOn,
    mockAppOn,
    mockAppQuit,
    mockDisableHardwareAcceleration,
    mockRegisterIPCHandlers,
    mockWaitForPort,
    mockCreateApplicationMenu,
    mockInitAutoUpdater,
    mockCreateTray,
    mockRegisterDeepLinkProtocol,
    mockHandleDeepLink,
    mockRequestSingleInstanceLock,
    mockIsDefaultProtocolClient,
    mockSetAsDefaultProtocolClient,
    mockWebContentsOpenDevTools,
  };
});

vi.mock('electron', () => {
  class MockBrowserWindow {
    options: unknown;
    loadURL = mocks.mockLoadURL;
    loadFile = mocks.mockLoadFile;
    on = mocks.mockWindowOn;
    webContents = { openDevTools: mocks.mockWebContentsOpenDevTools };

    constructor(options: unknown) {
      this.options = options;
    }
  }

  return {
    app: {
      disableHardwareAcceleration: mocks.mockDisableHardwareAcceleration,
      on: mocks.mockAppOn,
      quit: mocks.mockAppQuit,
      requestSingleInstanceLock: mocks.mockRequestSingleInstanceLock,
      isDefaultProtocolClient: mocks.mockIsDefaultProtocolClient,
      setAsDefaultProtocolClient: mocks.mockSetAsDefaultProtocolClient,
    },
    BrowserWindow: MockBrowserWindow,
    nativeTheme: {
      themeSource: 'system',
      shouldUseDarkColors: false,
    },
  };
});

vi.mock('./ipc', () => ({
  registerIPCHandlers: mocks.mockRegisterIPCHandlers,
}));

vi.mock('./menu', () => ({
  createApplicationMenu: mocks.mockCreateApplicationMenu,
}));

vi.mock('./auto-updater', () => ({
  initAutoUpdater: mocks.mockInitAutoUpdater,
}));

vi.mock('./tray', () => ({
  createTray: mocks.mockCreateTray,
}));

vi.mock('./deep-links', () => ({
  registerDeepLinkProtocol: mocks.mockRegisterDeepLinkProtocol,
  handleDeepLink: mocks.mockHandleDeepLink,
}));

// Mock @bslt/server-system which exports waitForPort
vi.mock('@bslt/server-system', () => ({
  waitForPort: mocks.mockWaitForPort,
}));

// Mock path module
vi.mock('path', () => ({
  join: vi.fn((...args: string[]) => args.join('/')),
  default: {
    join: vi.fn((...args: string[]) => args.join('/')),
  },
}));

describe('main', () => {
  const originalNodeEnv = process.env['NODE_ENV'];

  beforeEach(() => {
    vi.clearAllMocks();
    // Default to development mode for most tests
    process.env['NODE_ENV'] = 'development';
  });

  afterEach(() => {
    process.env['NODE_ENV'] = originalNodeEnv;
  });

  describe('app initialization', () => {
    it('should disable hardware acceleration', async () => {
      vi.resetModules();
      await import('./main');

      expect(mocks.mockDisableHardwareAcceleration).toHaveBeenCalledTimes(1);
    });

    it('should register IPC handlers with getMainWindow function', async () => {
      vi.resetModules();
      await import('./main');

      expect(mocks.mockRegisterIPCHandlers).toHaveBeenCalledTimes(1);
      expect(mocks.mockRegisterIPCHandlers).toHaveBeenCalledWith(expect.any(Function));
    });

    it('should register deep link protocol', async () => {
      vi.resetModules();
      await import('./main');

      expect(mocks.mockRegisterDeepLinkProtocol).toHaveBeenCalledTimes(1);
      expect(mocks.mockRegisterDeepLinkProtocol).toHaveBeenCalledWith('bslt');
    });

    it('should request single instance lock', async () => {
      vi.resetModules();
      await import('./main');

      expect(mocks.mockRequestSingleInstanceLock).toHaveBeenCalledTimes(1);
    });

    it('should register app ready event listener', async () => {
      vi.resetModules();
      await import('./main');

      expect(mocks.mockAppOn).toHaveBeenCalledWith('ready', expect.any(Function));
    });

    it('should register window-all-closed event listener', async () => {
      vi.resetModules();
      await import('./main');

      expect(mocks.mockAppOn).toHaveBeenCalledWith('window-all-closed', expect.any(Function));
    });

    it('should register activate event listener', async () => {
      vi.resetModules();
      await import('./main');

      expect(mocks.mockAppOn).toHaveBeenCalledWith('activate', expect.any(Function));
    });

    it('should register open-url event listener for macOS deep links', async () => {
      vi.resetModules();
      await import('./main');

      expect(mocks.mockAppOn).toHaveBeenCalledWith('open-url', expect.any(Function));
    });

    it('should register second-instance event listener for deep links', async () => {
      vi.resetModules();
      await import('./main');

      expect(mocks.mockAppOn).toHaveBeenCalledWith('second-instance', expect.any(Function));
    });
  });

  describe('window creation', () => {
    it('should create application menu on window creation', async () => {
      vi.resetModules();
      await import('./main');

      const readyCall = mocks.mockAppOn.mock.calls.find((call) => call[0] === 'ready') as
        | [string, unknown]
        | undefined;
      expect(readyCall).toBeDefined();
      const readyCallback = readyCall![1] as () => Promise<void>;
      await readyCallback();

      expect(mocks.mockCreateApplicationMenu).toHaveBeenCalledTimes(1);
    });

    it('should create system tray on window creation', async () => {
      vi.resetModules();
      await import('./main');

      const readyCall = mocks.mockAppOn.mock.calls.find((call) => call[0] === 'ready') as
        | [string, unknown]
        | undefined;
      const readyCallback = readyCall![1] as () => Promise<void>;
      await readyCallback();

      expect(mocks.mockCreateTray).toHaveBeenCalledTimes(1);
    });

    it('should not init auto-updater in development mode', async () => {
      vi.resetModules();
      await import('./main');

      const readyCall = mocks.mockAppOn.mock.calls.find((call) => call[0] === 'ready') as
        | [string, unknown]
        | undefined;
      const readyCallback = readyCall![1] as () => Promise<void>;
      await readyCallback();

      expect(mocks.mockInitAutoUpdater).not.toHaveBeenCalled();
    });

    it('should init auto-updater in production mode', async () => {
      process.env['NODE_ENV'] = 'production';

      vi.resetModules();
      await import('./main');

      const readyCall = mocks.mockAppOn.mock.calls.find((call) => call[0] === 'ready') as
        | [string, unknown]
        | undefined;
      const readyCallback = readyCall![1] as () => Promise<void>;
      await readyCallback();

      expect(mocks.mockInitAutoUpdater).toHaveBeenCalledTimes(1);
    });
  });

  describe('window creation in development mode', () => {
    it('should load URL in development mode', async () => {
      vi.resetModules();
      await import('./main');

      const readyCall = mocks.mockAppOn.mock.calls.find((call) => call[0] === 'ready') as
        | [string, unknown]
        | undefined;
      expect(readyCall).toBeDefined();
      const readyCallback = readyCall![1] as () => Promise<void>;
      await readyCallback();

      expect(mocks.mockWaitForPort).toHaveBeenCalled();
      expect(mocks.mockLoadURL).toHaveBeenCalledWith('http://localhost:5174');
    });

    it('should wait for renderer port in development mode', async () => {
      vi.resetModules();
      await import('./main');

      const readyCall = mocks.mockAppOn.mock.calls.find((call) => call[0] === 'ready');
      const readyCallback = readyCall![1] as () => Promise<void>;
      await readyCallback();

      // The code builds array as [rendererPortPreference, 5174, 5173, 5175]
      // where rendererPortPreference defaults to 5174, resulting in [5174, 5174, 5173, 5175]
      expect(mocks.mockWaitForPort).toHaveBeenCalledWith([5174, 5174, 5173, 5175], 'localhost');
    });

    it('should call window.on when window is created', async () => {
      vi.resetModules();
      await import('./main');

      const readyCall = mocks.mockAppOn.mock.calls.find((call) => call[0] === 'ready');
      const readyCallback = readyCall![1] as () => void;
      readyCallback();

      // Wait for the async createWindow to complete
      await vi.waitFor(() => {
        expect(mocks.mockWindowOn).toHaveBeenCalled();
      });
    });
  });

  describe('window creation in production mode', () => {
    it('should load file in production mode', async () => {
      process.env['NODE_ENV'] = 'production';

      vi.resetModules();
      await import('./main');

      const readyCall = mocks.mockAppOn.mock.calls.find((call) => call[0] === 'ready');
      const readyCallback = readyCall![1] as () => Promise<void>;
      await readyCallback();

      expect(mocks.mockLoadFile).toHaveBeenCalledWith(
        expect.stringContaining('renderer/index.html'),
      );
      expect(mocks.mockWaitForPort).not.toHaveBeenCalled();
    });
  });

  describe('window-all-closed handler', () => {
    it('should quit app on non-darwin platform', async () => {
      const originalPlatform = process.platform;
      Object.defineProperty(process, 'platform', { value: 'win32' });

      vi.resetModules();
      await import('./main');

      const windowAllClosedCall = mocks.mockAppOn.mock.calls.find(
        (call) => call[0] === 'window-all-closed',
      ) as [string, unknown] | undefined;
      const windowAllClosedCallback = windowAllClosedCall![1] as () => void;
      windowAllClosedCallback();

      expect(mocks.mockAppQuit).toHaveBeenCalledTimes(1);

      Object.defineProperty(process, 'platform', { value: originalPlatform });
    });

    it('should not quit app on darwin platform', async () => {
      const originalPlatform = process.platform;
      Object.defineProperty(process, 'platform', { value: 'darwin' });

      vi.resetModules();
      await import('./main');

      const windowAllClosedCall = mocks.mockAppOn.mock.calls.find(
        (call) => call[0] === 'window-all-closed',
      ) as [string, unknown] | undefined;
      const windowAllClosedCallback = windowAllClosedCall![1] as () => void;
      windowAllClosedCallback();

      expect(mocks.mockAppQuit).not.toHaveBeenCalled();

      Object.defineProperty(process, 'platform', { value: originalPlatform });
    });
  });

  describe('activate handler', () => {
    it('should call createWindow when activate is triggered after window closed', async () => {
      vi.resetModules();
      await import('./main');

      // Trigger ready to create a window
      const readyCall = mocks.mockAppOn.mock.calls.find((call) => call[0] === 'ready');
      const readyCallback = readyCall![1] as () => void;
      readyCallback();

      // Wait for the async createWindow to complete and register the closed callback
      await vi.waitFor(() => {
        const closedCall = mocks.mockWindowOn.mock.calls.find((call) => call[0] === 'closed');
        expect(closedCall).toBeDefined();
      });

      // Simulate window close by calling the closed callback
      const closedCall = mocks.mockWindowOn.mock.calls.find((call) => call[0] === 'closed');
      const closedCallback = closedCall![1] as () => void;
      closedCallback();

      // Clear load URL mock to track new calls
      mocks.mockLoadURL.mockClear();

      // Trigger activate
      const activateCall = mocks.mockAppOn.mock.calls.find((call) => call[0] === 'activate') as
        | [string, unknown]
        | undefined;
      expect(activateCall).toBeDefined();
      const activateCallback = activateCall![1] as () => void;
      activateCallback();

      // Wait for the new window to be created
      await vi.waitFor(() => {
        expect(mocks.mockLoadURL).toHaveBeenCalled();
      });
    });

    it('should not create window on activate if window already exists', async () => {
      vi.resetModules();
      await import('./main');

      // Trigger ready to create a window
      const readyCall = mocks.mockAppOn.mock.calls.find((call) => call[0] === 'ready');
      const readyCallback = readyCall![1] as () => void;
      readyCallback();

      // Wait for the async createWindow to complete
      await vi.waitFor(() => {
        expect(mocks.mockLoadURL).toHaveBeenCalled();
      });

      // Clear load URL mock to track new calls
      mocks.mockLoadURL.mockClear();

      // Trigger activate without closing the window first
      const activateCall = mocks.mockAppOn.mock.calls.find((call) => call[0] === 'activate') as
        | [string, unknown]
        | undefined;
      expect(activateCall).toBeDefined();
      const activateCallback = activateCall![1] as () => void;
      activateCallback();

      // Give a small delay to ensure any async operations complete
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Should NOT have created a new window since mainWindow is not null
      expect(mocks.mockLoadURL).not.toHaveBeenCalled();
    });
  });

  describe('getMainWindow', () => {
    it('should return null before window is created', async () => {
      vi.resetModules();
      await import('./main');

      // Get the getMainWindow function passed to registerIPCHandlers
      const getMainWindow = mocks.mockRegisterIPCHandlers.mock.calls[0]?.[0] as () => unknown;

      // Before window is created, it should return null
      expect(getMainWindow()).toBeNull();
    });

    it('should return window instance after window is created', async () => {
      vi.resetModules();
      await import('./main');

      // Get the getMainWindow function passed to registerIPCHandlers
      const getMainWindow = mocks.mockRegisterIPCHandlers.mock.calls[0]?.[0] as () => unknown;

      // Create the window
      const readyCall = mocks.mockAppOn.mock.calls.find((call) => call[0] === 'ready');
      const readyCallback = readyCall![1] as () => Promise<void>;
      await readyCallback();

      // After window is created, it should return the window instance
      expect(getMainWindow()).toBeDefined();
      expect(getMainWindow()).not.toBeNull();
    });
  });
});
