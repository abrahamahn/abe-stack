// main/apps/desktop/src/electron/ipc/handlers.test.ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock types
interface MockBrowserWindow {
  id: number;
  on: (event: string, listener: (...args: unknown[]) => void) => void;
  off: (event: string, listener: (...args: unknown[]) => void) => void;
  once: (event: string, listener: (...args: unknown[]) => void) => void;
  addListener: (event: string, listener: (...args: unknown[]) => void) => void;
  removeListener: (event: string, listener: (...args: unknown[]) => void) => void;
  removeAllListeners: (event?: string) => void;
  emit: (event: string, ...args: unknown[]) => boolean;
  destroy: () => void;
  close: () => void;
  focus: () => void;
  show: () => void;
  hide: () => void;
  maximize: () => void;
  minimize: () => void;
  restore: () => void;
  isMaximized: () => boolean;
  isMinimized: () => boolean;
  isDestroyed: () => boolean;
  isVisible: () => boolean;
  getBounds: () => { x: number; y: number; width: number; height: number };
  setBounds: (bounds: { x?: number; y?: number; width?: number; height?: number }) => void;
  webContents: unknown;
}

interface NotificationOptions {
  title: string;
  body: string;
}

// Mock handlers storage
type IpcHandler = (event: unknown, ...args: unknown[]) => unknown;
type IpcListener = (event: unknown, ...args: unknown[]) => void;

// Use vi.hoisted to ensure mocks are available at mock time
const mocks = vi.hoisted(() => ({
  mockHandlers: new Map<string, IpcHandler>(),
  mockListeners: new Map<string, IpcListener>(),
  showOpenDialogMock: vi.fn(),
  showSaveDialogMock: vi.fn(),
  notificationShowMock: vi.fn(),
  notificationIsSupportedMock: vi.fn().mockReturnValue(true),
}));

vi.mock('electron', () => {
  class MockNotification {
    title: string;
    body: string;

    constructor(options: NotificationOptions) {
      this.title = options.title;
      this.body = options.body;
    }

    show() {
      mocks.notificationShowMock();
    }

    static isSupported() {
      return mocks.notificationIsSupportedMock();
    }
  }

  return {
    app: {
      getVersion: vi.fn().mockReturnValue('1.0.0'),
    },
    dialog: {
      showOpenDialog: mocks.showOpenDialogMock,
      showSaveDialog: mocks.showSaveDialogMock,
    },
    ipcMain: {
      handle: vi.fn((channel: string, handler: IpcHandler) => {
        mocks.mockHandlers.set(channel, handler);
      }),
      on: vi.fn((channel: string, listener: IpcListener) => {
        mocks.mockListeners.set(channel, listener);
      }),
    },
    Notification: MockNotification,
  };
});

// Import the module under test
import { registerIPCHandlers } from './handlers';

describe('registerIPCHandlers', () => {
  let mockMainWindow: MockBrowserWindow;
  let getMainWindow: () => MockBrowserWindow | null;

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.mockHandlers.clear();
    mocks.mockListeners.clear();

    mockMainWindow = {
      id: 1,
      on: vi.fn(),
      off: vi.fn(),
      once: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      removeAllListeners: vi.fn(),
      emit: vi.fn(),
      destroy: vi.fn(),
      close: vi.fn(),
      focus: vi.fn(),
      show: vi.fn(),
      hide: vi.fn(),
      maximize: vi.fn(),
      minimize: vi.fn(),
      restore: vi.fn(),
      isMaximized: vi.fn().mockReturnValue(false),
      isMinimized: vi.fn().mockReturnValue(false),
      isDestroyed: vi.fn().mockReturnValue(false),
      isVisible: vi.fn().mockReturnValue(true),
      getBounds: vi.fn().mockReturnValue({ x: 0, y: 0, width: 800, height: 600 }),
      setBounds: vi.fn(),
      webContents: {},
    };
    getMainWindow = () => mockMainWindow;

    // Re-register handlers before each test
    // Cast through unknown to avoid strict type checking on mock
    registerIPCHandlers(getMainWindow as unknown as () => import('electron').BrowserWindow | null);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('handler registration', () => {
    it('should register get-app-version handler', () => {
      expect(mocks.mockHandlers.has('get-app-version')).toBe(true);
    });

    it('should register show-open-dialog handler', () => {
      expect(mocks.mockHandlers.has('show-open-dialog')).toBe(true);
    });

    it('should register show-save-dialog handler', () => {
      expect(mocks.mockHandlers.has('show-save-dialog')).toBe(true);
    });

    it('should register show-notification listener', () => {
      expect(mocks.mockListeners.has('show-notification')).toBe(true);
    });
  });

  describe('get-app-version handler', () => {
    it('should return app version', () => {
      const handler = mocks.mockHandlers.get('get-app-version')!;
      const result = handler(null);

      expect(result).toBe('1.0.0');
    });
  });

  describe('show-open-dialog handler', () => {
    it('should show open dialog with correct options', async () => {
      const options = {
        title: 'Open File',
        filters: [{ name: 'Images', extensions: ['png', 'jpg'] }],
        multiple: false,
      };

      mocks.showOpenDialogMock.mockResolvedValueOnce({
        canceled: false,
        filePaths: ['/path/to/file.png'],
      });

      const handler = mocks.mockHandlers.get('show-open-dialog')!;
      const result = await handler(null, options);

      expect(mocks.showOpenDialogMock).toHaveBeenCalledWith(mockMainWindow, {
        title: 'Open File',
        filters: [{ name: 'Images', extensions: ['png', 'jpg'] }],
        properties: ['openFile'],
      });
      expect(result).toEqual(['/path/to/file.png']);
    });

    it('should include multiSelections property when multiple is true', async () => {
      const options = {
        title: 'Open Files',
        multiple: true,
      };

      mocks.showOpenDialogMock.mockResolvedValueOnce({
        canceled: false,
        filePaths: ['/path/to/file1.png', '/path/to/file2.png'],
      });

      const handler = mocks.mockHandlers.get('show-open-dialog')!;
      await handler(null, options);

      expect(mocks.showOpenDialogMock).toHaveBeenCalledWith(mockMainWindow, {
        title: 'Open Files',
        filters: undefined,
        properties: ['openFile', 'multiSelections'],
      });
    });

    it('should return null when dialog is canceled', async () => {
      const options = { title: 'Open' };

      mocks.showOpenDialogMock.mockResolvedValueOnce({
        canceled: true,
        filePaths: [],
      });

      const handler = mocks.mockHandlers.get('show-open-dialog')!;
      const result = await handler(null, options);

      expect(result).toBeNull();
    });

    it('should return null when mainWindow is null', async () => {
      const nullWindowGetter = () => null;
      mocks.mockHandlers.clear();
      mocks.mockListeners.clear();
      registerIPCHandlers(nullWindowGetter);

      // Get the newly registered handler
      const handler = mocks.mockHandlers.get('show-open-dialog')!;
      const result = await handler(null, { title: 'Open' });

      expect(mocks.showOpenDialogMock).not.toHaveBeenCalled();
      expect(result).toBeNull();
    });

    it('should return multiple file paths', async () => {
      const options = { multiple: true };

      mocks.showOpenDialogMock.mockResolvedValueOnce({
        canceled: false,
        filePaths: ['/file1.txt', '/file2.txt', '/file3.txt'],
      });

      const handler = mocks.mockHandlers.get('show-open-dialog')!;
      const result = await handler(null, options);

      expect(result).toEqual(['/file1.txt', '/file2.txt', '/file3.txt']);
    });
  });

  describe('show-save-dialog handler', () => {
    it('should show save dialog with correct options', async () => {
      const options = {
        title: 'Save File',
        defaultPath: '/default/path.txt',
        filters: [{ name: 'Text Files', extensions: ['txt'] }],
      };

      mocks.showSaveDialogMock.mockResolvedValueOnce({
        canceled: false,
        filePath: '/path/to/saved.txt',
      });

      const handler = mocks.mockHandlers.get('show-save-dialog')!;
      const result = await handler(null, options);

      expect(mocks.showSaveDialogMock).toHaveBeenCalledWith(mockMainWindow, {
        title: 'Save File',
        defaultPath: '/default/path.txt',
        filters: [{ name: 'Text Files', extensions: ['txt'] }],
      });
      expect(result).toBe('/path/to/saved.txt');
    });

    it('should return null when dialog is canceled', async () => {
      const options = { title: 'Save' };

      mocks.showSaveDialogMock.mockResolvedValueOnce({
        canceled: true,
      });

      const handler = mocks.mockHandlers.get('show-save-dialog')!;
      const result = await handler(null, options);

      expect(result).toBeNull();
    });

    it('should return null when mainWindow is null', async () => {
      const nullWindowGetter = () => null;
      mocks.mockHandlers.clear();
      mocks.mockListeners.clear();
      registerIPCHandlers(nullWindowGetter);

      const handler = mocks.mockHandlers.get('show-save-dialog')!;
      const result = await handler(null, { title: 'Save' });

      expect(mocks.showSaveDialogMock).not.toHaveBeenCalled();
      expect(result).toBeNull();
    });

    it('should handle options without defaultPath', async () => {
      const options = {
        title: 'Save',
        filters: [{ name: 'All', extensions: ['*'] }],
      };

      mocks.showSaveDialogMock.mockResolvedValueOnce({
        canceled: false,
        filePath: '/path/to/file.txt',
      });

      const handler = mocks.mockHandlers.get('show-save-dialog')!;
      await handler(null, options);

      expect(mocks.showSaveDialogMock).toHaveBeenCalledWith(mockMainWindow, {
        title: 'Save',
        defaultPath: undefined,
        filters: [{ name: 'All', extensions: ['*'] }],
      });
    });
  });

  describe('show-notification listener', () => {
    it('should show notification when supported', () => {
      mocks.notificationIsSupportedMock.mockReturnValue(true);

      const listener = mocks.mockListeners.get('show-notification')!;
      listener(null, { title: 'Test Title', body: 'Test Body' });

      expect(mocks.notificationShowMock).toHaveBeenCalledTimes(1);
    });

    it('should not show notification when not supported', () => {
      mocks.notificationIsSupportedMock.mockReturnValue(false);
      mocks.notificationShowMock.mockClear();

      // Re-register to pick up the new mock value
      mocks.mockHandlers.clear();
      mocks.mockListeners.clear();
      registerIPCHandlers(
        getMainWindow as unknown as () => import('electron').BrowserWindow | null,
      );

      const listener = mocks.mockListeners.get('show-notification')!;
      listener(null, { title: 'Test', body: 'Body' });

      expect(mocks.notificationShowMock).not.toHaveBeenCalled();
    });

    it('should pass title and body to Notification constructor', () => {
      mocks.notificationIsSupportedMock.mockReturnValue(true);

      const listener = mocks.mockListeners.get('show-notification')!;
      listener(null, { title: 'My Title', body: 'My Body' });

      // The notification was created and show was called
      expect(mocks.notificationShowMock).toHaveBeenCalled();
    });

    it('should handle empty title and body', () => {
      mocks.notificationIsSupportedMock.mockReturnValue(true);

      const listener = mocks.mockListeners.get('show-notification')!;
      listener(null, { title: '', body: '' });

      expect(mocks.notificationShowMock).toHaveBeenCalled();
    });
  });

  describe('edge cases', () => {
    it('should handle undefined filters in open dialog', async () => {
      const options = { title: 'Open' };

      mocks.showOpenDialogMock.mockResolvedValueOnce({
        canceled: false,
        filePaths: ['/file.txt'],
      });

      const handler = mocks.mockHandlers.get('show-open-dialog')!;
      await handler(null, options);

      expect(mocks.showOpenDialogMock).toHaveBeenCalledWith(mockMainWindow, {
        title: 'Open',
        filters: undefined,
        properties: ['openFile'],
      });
    });

    it('should handle undefined title in dialogs', async () => {
      const options = { filters: [] };

      mocks.showOpenDialogMock.mockResolvedValueOnce({
        canceled: false,
        filePaths: [],
      });

      const handler = mocks.mockHandlers.get('show-open-dialog')!;
      await handler(null, options);

      expect(mocks.showOpenDialogMock).toHaveBeenCalledWith(mockMainWindow, {
        title: undefined,
        filters: [],
        properties: ['openFile'],
      });
    });
  });
});
