// apps/desktop/src/electron/preload.test.ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock ipcRenderer
const mockInvoke = vi.fn();
const mockSend = vi.fn();
const mockIpcRenderer = {
  invoke: mockInvoke,
  send: mockSend,
};

// Mock shell
const mockOpenExternal = vi.fn().mockResolvedValue(undefined);
const mockShell = {
  openExternal: mockOpenExternal,
};

// Mock contextBridge
const mockExposeInMainWorld = vi.fn();
const mockContextBridge = {
  exposeInMainWorld: mockExposeInMainWorld,
};

vi.mock('electron', () => ({
  contextBridge: mockContextBridge,
  ipcRenderer: mockIpcRenderer,
  shell: mockShell,
}));

// Re-import the types for testing
import type { NativeBridge } from '@abe-stack/core';

describe('preload', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('contextBridge exposure', () => {
    it('should expose electronAPI to main world', async () => {
      await import('./preload');

      expect(mockExposeInMainWorld).toHaveBeenCalledTimes(1);
      expect(mockExposeInMainWorld).toHaveBeenCalledWith('electronAPI', expect.any(Object));
    });

    it('should expose NativeBridge interface', async () => {
      await import('./preload');

      const exposedApi = mockExposeInMainWorld.mock.calls[0]?.[1] as NativeBridge;

      expect(exposedApi).toHaveProperty('getPlatform');
      expect(exposedApi).toHaveProperty('sendNotification');
      expect(exposedApi).toHaveProperty('isNative');
      expect(exposedApi).toHaveProperty('getAppVersion');
      expect(exposedApi).toHaveProperty('openExternal');
      expect(exposedApi).toHaveProperty('showOpenDialog');
      expect(exposedApi).toHaveProperty('showSaveDialog');
    });
  });

  describe('electronBridge API', () => {
    let electronBridge: NativeBridge;

    beforeEach(async () => {
      vi.resetModules();
      await import('./preload');
      electronBridge = mockExposeInMainWorld.mock.calls[0]?.[1] as NativeBridge;
    });

    describe('getPlatform', () => {
      it('should return "electron"', async () => {
        const platform = await electronBridge.getPlatform();

        expect(platform).toBe('electron');
      });
    });

    describe('sendNotification', () => {
      it('should send notification via IPC', () => {
        electronBridge.sendNotification('Test Title', 'Test Body');

        expect(mockSend).toHaveBeenCalledTimes(1);
        expect(mockSend).toHaveBeenCalledWith('show-notification', {
          title: 'Test Title',
          body: 'Test Body',
        });
      });

      it('should handle empty strings', () => {
        electronBridge.sendNotification('', '');

        expect(mockSend).toHaveBeenCalledWith('show-notification', {
          title: '',
          body: '',
        });
      });
    });

    describe('isNative', () => {
      it('should return true', () => {
        const isNative = electronBridge.isNative();

        expect(isNative).toBe(true);
      });
    });

    describe('getAppVersion', () => {
      it('should invoke get-app-version IPC channel', async () => {
        mockInvoke.mockResolvedValueOnce('1.0.0');

        const version = await electronBridge.getAppVersion();

        expect(mockInvoke).toHaveBeenCalledTimes(1);
        expect(mockInvoke).toHaveBeenCalledWith('get-app-version');
        expect(version).toBe('1.0.0');
      });

      it('should return version string from IPC', async () => {
        mockInvoke.mockResolvedValueOnce('2.5.3');

        const version = await electronBridge.getAppVersion();

        expect(version).toBe('2.5.3');
      });
    });

    describe('openExternal', () => {
      it('should open external URL via shell', async () => {
        await electronBridge.openExternal('https://example.com');

        expect(mockOpenExternal).toHaveBeenCalledTimes(1);
        expect(mockOpenExternal).toHaveBeenCalledWith('https://example.com');
      });

      it('should handle different URL schemes', async () => {
        await electronBridge.openExternal('mailto:test@example.com');

        expect(mockOpenExternal).toHaveBeenCalledWith('mailto:test@example.com');
      });
    });

    describe('showOpenDialog', () => {
      it('should invoke show-open-dialog IPC channel with options', async () => {
        const options = {
          title: 'Open File',
          filters: [{ name: 'Images', extensions: ['png', 'jpg'] }],
          multiple: false,
        };
        mockInvoke.mockResolvedValueOnce(['/path/to/file.png']);

        const result = await electronBridge.showOpenDialog!(options);

        expect(mockInvoke).toHaveBeenCalledTimes(1);
        expect(mockInvoke).toHaveBeenCalledWith('show-open-dialog', options);
        expect(result).toEqual(['/path/to/file.png']);
      });

      it('should return null when dialog is canceled', async () => {
        const options = { title: 'Open File' };
        mockInvoke.mockResolvedValueOnce(null);

        const result = await electronBridge.showOpenDialog!(options);

        expect(result).toBeNull();
      });

      it('should return multiple files when multiple is true', async () => {
        const options = {
          title: 'Open Files',
          multiple: true,
        };
        mockInvoke.mockResolvedValueOnce(['/path/to/file1.png', '/path/to/file2.png']);

        const result = await electronBridge.showOpenDialog!(options);

        expect(result).toEqual(['/path/to/file1.png', '/path/to/file2.png']);
      });
    });

    describe('showSaveDialog', () => {
      it('should invoke show-save-dialog IPC channel with options', async () => {
        const options = {
          title: 'Save File',
          defaultPath: '/path/to/default.txt',
          filters: [{ name: 'Text Files', extensions: ['txt'] }],
        };
        mockInvoke.mockResolvedValueOnce('/path/to/saved.txt');

        const result = await electronBridge.showSaveDialog!(options);

        expect(mockInvoke).toHaveBeenCalledTimes(1);
        expect(mockInvoke).toHaveBeenCalledWith('show-save-dialog', options);
        expect(result).toBe('/path/to/saved.txt');
      });

      it('should return null when dialog is canceled', async () => {
        const options = { title: 'Save File' };
        mockInvoke.mockResolvedValueOnce(null);

        const result = await electronBridge.showSaveDialog!(options);

        expect(result).toBeNull();
      });

      it('should handle options without filters', async () => {
        const options = { title: 'Save' };
        mockInvoke.mockResolvedValueOnce('/path/to/file.txt');

        const result = await electronBridge.showSaveDialog!(options);

        expect(mockInvoke).toHaveBeenCalledWith('show-save-dialog', options);
        expect(result).toBe('/path/to/file.txt');
      });
    });
  });

  describe('type-safe invoke function', () => {
    beforeEach(async () => {
      vi.resetModules();
      await import('./preload');
    });

    it('should pass through IPC channel arguments correctly', async () => {
      const electronBridge = mockExposeInMainWorld.mock.calls[0]?.[1] as NativeBridge;

      const openDialogOptions = {
        title: 'Test',
        filters: [{ name: 'All', extensions: ['*'] }],
      };

      mockInvoke.mockResolvedValueOnce(['/file.txt']);

      await electronBridge.showOpenDialog!(openDialogOptions);

      expect(mockInvoke).toHaveBeenCalledWith('show-open-dialog', openDialogOptions);
    });
  });
});
