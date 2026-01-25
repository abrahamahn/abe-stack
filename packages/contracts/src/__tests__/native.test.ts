// packages/core/src/contracts/__tests__/native.test.ts
import { describe, expect, it } from 'vitest';

import type { NativeBridge } from '../native';

describe('NativeBridge interface', () => {
  it('should define required methods', () => {
    // Create a mock implementation to verify interface
    const mockBridge: NativeBridge = {
      getPlatform: async () => 'electron',
      sendNotification: () => {},
      isNative: () => true,
      getAppVersion: async () => '1.0.0',
      openExternal: async () => {},
    };

    expect(mockBridge.getPlatform).toBeDefined();
    expect(mockBridge.sendNotification).toBeDefined();
    expect(mockBridge.isNative).toBeDefined();
    expect(mockBridge.getAppVersion).toBeDefined();
    expect(mockBridge.openExternal).toBeDefined();
  });

  it('should allow optional dialog methods', () => {
    const bridgeWithDialogs: NativeBridge = {
      getPlatform: async () => 'electron',
      sendNotification: () => {},
      isNative: () => true,
      getAppVersion: async () => '1.0.0',
      openExternal: async () => {},
      showOpenDialog: async () => ['/path/to/file'],
      showSaveDialog: async () => '/path/to/save',
    };

    expect(bridgeWithDialogs.showOpenDialog).toBeDefined();
    expect(bridgeWithDialogs.showSaveDialog).toBeDefined();
  });

  it('should work without optional dialog methods', () => {
    const bridgeWithoutDialogs: NativeBridge = {
      getPlatform: async () => 'web',
      sendNotification: () => {},
      isNative: () => false,
      getAppVersion: async () => '1.0.0',
      openExternal: async () => {},
    };

    expect(bridgeWithoutDialogs.showOpenDialog).toBeUndefined();
    expect(bridgeWithoutDialogs.showSaveDialog).toBeUndefined();
  });

  describe('getPlatform', () => {
    it('should return platform string', async () => {
      const bridge: NativeBridge = {
        getPlatform: async () => 'electron',
        sendNotification: () => {},
        isNative: () => true,
        getAppVersion: async () => '1.0.0',
        openExternal: async () => {},
      };

      const platform = await bridge.getPlatform();
      expect(typeof platform).toBe('string');
      expect(['electron', 'react-native', 'web']).toContain(platform);
    });
  });

  describe('isNative', () => {
    it('should return boolean', () => {
      const bridge: NativeBridge = {
        getPlatform: async () => 'electron',
        sendNotification: () => {},
        isNative: () => true,
        getAppVersion: async () => '1.0.0',
        openExternal: async () => {},
      };

      expect(typeof bridge.isNative()).toBe('boolean');
    });
  });

  describe('showOpenDialog', () => {
    it('should accept options with filters', async () => {
      const bridge: NativeBridge = {
        getPlatform: async () => 'electron',
        sendNotification: () => {},
        isNative: () => true,
        getAppVersion: async () => '1.0.0',
        openExternal: async () => {},
        showOpenDialog: async (options) => {
          expect(options.title).toBe('Select File');
          expect(options.filters).toEqual([{ name: 'Images', extensions: ['png', 'jpg'] }]);
          expect(options.multiple).toBe(true);
          return ['/path/to/file.png'];
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
        getPlatform: async () => 'electron',
        sendNotification: () => {},
        isNative: () => true,
        getAppVersion: async () => '1.0.0',
        openExternal: async () => {},
        showOpenDialog: async () => null,
      };

      const result = await bridge.showOpenDialog?.({});
      expect(result).toBeNull();
    });
  });

  describe('showSaveDialog', () => {
    it('should accept options with defaultPath', async () => {
      const bridge: NativeBridge = {
        getPlatform: async () => 'electron',
        sendNotification: () => {},
        isNative: () => true,
        getAppVersion: async () => '1.0.0',
        openExternal: async () => {},
        showSaveDialog: async (options) => {
          expect(options.title).toBe('Save File');
          expect(options.defaultPath).toBe('/default/path.txt');
          return '/save/path.txt';
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
        getPlatform: async () => 'electron',
        sendNotification: () => {},
        isNative: () => true,
        getAppVersion: async () => '1.0.0',
        openExternal: async () => {},
        showSaveDialog: async () => null,
      };

      const result = await bridge.showSaveDialog?.({});
      expect(result).toBeNull();
    });
  });
});
