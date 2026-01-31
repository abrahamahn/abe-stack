// infra/contracts/src/native.test.ts
import { describe, expect, it } from 'vitest';

import type { NativeBridge } from './native';

describe('NativeBridge interface', () => {
  it('should define required methods', () => {
    // Create a mock implementation to verify interface
    const mockBridge: NativeBridge = {
      getPlatform: () => Promise.resolve('electron'),
      sendNotification: () => {},
      isNative: () => true,
      getAppVersion: () => Promise.resolve('1.0.0'),
      openExternal: () => Promise.resolve(),
    };

    expect(mockBridge.getPlatform).toBeDefined();
    expect(mockBridge.sendNotification).toBeDefined();
    expect(mockBridge.isNative).toBeDefined();
    expect(mockBridge.getAppVersion).toBeDefined();
    expect(mockBridge.openExternal).toBeDefined();
  });

  it('should allow optional dialog methods', () => {
    const bridgeWithDialogs: NativeBridge = {
      getPlatform: () => Promise.resolve('electron'),
      sendNotification: () => {},
      isNative: () => true,
      getAppVersion: () => Promise.resolve('1.0.0'),
      openExternal: () => Promise.resolve(),
      showOpenDialog: () => Promise.resolve(['/path/to/file']),
      showSaveDialog: () => Promise.resolve('/path/to/save'),
    };

    expect(bridgeWithDialogs.showOpenDialog).toBeDefined();
    expect(bridgeWithDialogs.showSaveDialog).toBeDefined();
  });

  it('should work without optional dialog methods', () => {
    const bridgeWithoutDialogs: NativeBridge = {
      getPlatform: () => Promise.resolve('web'),
      sendNotification: () => {},
      isNative: () => false,
      getAppVersion: () => Promise.resolve('1.0.0'),
      openExternal: () => Promise.resolve(),
    };

    expect(bridgeWithoutDialogs.showOpenDialog).toBeUndefined();
    expect(bridgeWithoutDialogs.showSaveDialog).toBeUndefined();
  });

  describe('getPlatform', () => {
    it('should return platform string', async () => {
      const bridge: NativeBridge = {
        getPlatform: () => Promise.resolve('electron'),
        sendNotification: () => {},
        isNative: () => true,
        getAppVersion: () => Promise.resolve('1.0.0'),
        openExternal: () => Promise.resolve(),
      };

      const platform = await bridge.getPlatform();
      expect(typeof platform).toBe('string');
      expect(['electron', 'react-native', 'web']).toContain(platform);
    });
  });

  describe('isNative', () => {
    it('should return boolean', () => {
      const bridge: NativeBridge = {
        getPlatform: () => Promise.resolve('electron'),
        sendNotification: () => {},
        isNative: () => true,
        getAppVersion: () => Promise.resolve('1.0.0'),
        openExternal: () => Promise.resolve(),
      };

      expect(typeof bridge.isNative()).toBe('boolean');
    });
  });

  describe('showOpenDialog', () => {
    it('should accept options with filters', async () => {
      const bridge: NativeBridge = {
        getPlatform: () => Promise.resolve('electron'),
        sendNotification: () => {},
        isNative: () => true,
        getAppVersion: () => Promise.resolve('1.0.0'),
        openExternal: () => Promise.resolve(),
        showOpenDialog: (options) => {
          expect(options.title).toBe('Select File');
          expect(options.filters).toEqual([{ name: 'Images', extensions: ['png', 'jpg'] }]);
          expect(options.multiple).toBe(true);
          return Promise.resolve(['/path/to/file.png']);
        },
      };

      const result = await bridge.showOpenDialog?.({
        title: 'Select File',
        filters: [{ name: 'Images', extensions: ['png', 'jpg'] }],
        multiple: true,
      });

      expect(result).toEqual(['/path/to/file.png']);
    });

    it('should return null when cancelled', async () => {
      const bridge: NativeBridge = {
        getPlatform: () => Promise.resolve('electron'),
        sendNotification: () => {},
        isNative: () => true,
        getAppVersion: () => Promise.resolve('1.0.0'),
        openExternal: () => Promise.resolve(),
        showOpenDialog: () => Promise.resolve(null),
      };

      const result = await bridge.showOpenDialog?.({});
      expect(result).toBeNull();
    });
  });

  describe('showSaveDialog', () => {
    it('should accept options with defaultPath', async () => {
      const bridge: NativeBridge = {
        getPlatform: () => Promise.resolve('electron'),
        sendNotification: () => {},
        isNative: () => true,
        getAppVersion: () => Promise.resolve('1.0.0'),
        openExternal: () => Promise.resolve(),
        showSaveDialog: (options) => {
          expect(options.title).toBe('Save File');
          expect(options.defaultPath).toBe('/default/path.txt');
          return Promise.resolve('/save/path.txt');
        },
      };

      const result = await bridge.showSaveDialog?.({
        title: 'Save File',
        defaultPath: '/default/path.txt',
      });

      expect(result).toBe('/save/path.txt');
    });

    it('should return null when cancelled', async () => {
      const bridge: NativeBridge = {
        getPlatform: () => Promise.resolve('electron'),
        sendNotification: () => {},
        isNative: () => true,
        getAppVersion: () => Promise.resolve('1.0.0'),
        openExternal: () => Promise.resolve(),
        showSaveDialog: () => Promise.resolve(null),
      };

      const result = await bridge.showSaveDialog?.({});
      expect(result).toBeNull();
    });
  });
});
