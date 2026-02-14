// main/apps/desktop/src/electron/deep-links.test.ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  isDefaultProtocolClient: vi.fn().mockReturnValue(false),
  setAsDefaultProtocolClient: vi.fn().mockReturnValue(true),
  webContentsSend: vi.fn(),
  isDestroyed: vi.fn().mockReturnValue(false),
  isVisible: vi.fn().mockReturnValue(true),
  show: vi.fn(),
  focus: vi.fn(),
}));

vi.mock('electron', () => ({
  app: {
    isDefaultProtocolClient: mocks.isDefaultProtocolClient,
    setAsDefaultProtocolClient: mocks.setAsDefaultProtocolClient,
  },
}));

import { handleDeepLink, parseDeepLinkUrl, registerDeepLinkProtocol } from './deep-links';

import type { BrowserWindow } from 'electron';

function createMockWindow(): BrowserWindow {
  return {
    isDestroyed: mocks.isDestroyed,
    isVisible: mocks.isVisible,
    show: mocks.show,
    focus: mocks.focus,
    webContents: {
      send: mocks.webContentsSend,
    },
  } as unknown as BrowserWindow;
}

describe('deep-links', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('parseDeepLinkUrl', () => {
    it('should parse a simple path', () => {
      const result = parseDeepLinkUrl('abe-stack://dashboard');

      expect(result.path).toBe('/dashboard');
      expect(result.query).toEqual({});
    });

    it('should parse path with query parameters', () => {
      const result = parseDeepLinkUrl('abe-stack://settings/profile?tab=security&mode=edit');

      expect(result.path).toBe('/settings/profile');
      expect(result.query).toEqual({ tab: 'security', mode: 'edit' });
    });

    it('should handle root path', () => {
      const result = parseDeepLinkUrl('abe-stack://');

      expect(result.path).toBe('/');
      expect(result.query).toEqual({});
    });

    it('should return root path for malformed URL', () => {
      const result = parseDeepLinkUrl('not-a-valid-url');

      expect(result.path).toBe('/');
      expect(result.query).toEqual({});
    });

    it('should handle URL with empty query string', () => {
      const result = parseDeepLinkUrl('abe-stack://users?');

      expect(result.path).toBe('/users');
      expect(result.query).toEqual({});
    });

    it('should handle deeply nested paths', () => {
      const result = parseDeepLinkUrl('abe-stack://admin/users/123/edit');

      expect(result.path).toBe('/admin/users/123/edit');
      expect(result.query).toEqual({});
    });
  });

  describe('handleDeepLink', () => {
    it('should send deep-link-navigation event to renderer', () => {
      const mainWindow = createMockWindow();

      handleDeepLink('abe-stack://dashboard', mainWindow);

      expect(mocks.webContentsSend).toHaveBeenCalledWith('deep-link-navigation', {
        path: '/dashboard',
        query: {},
      });
    });

    it('should include query params in the payload', () => {
      const mainWindow = createMockWindow();

      handleDeepLink('abe-stack://settings?tab=profile', mainWindow);

      expect(mocks.webContentsSend).toHaveBeenCalledWith('deep-link-navigation', {
        path: '/settings',
        query: { tab: 'profile' },
      });
    });

    it('should not send to renderer if window is destroyed', () => {
      const mainWindow = createMockWindow();
      mocks.isDestroyed.mockReturnValue(true);

      handleDeepLink('abe-stack://dashboard', mainWindow);

      expect(mocks.webContentsSend).not.toHaveBeenCalled();
    });

    it('should show hidden window when deep link is received', () => {
      const mainWindow = createMockWindow();
      mocks.isVisible.mockReturnValue(false);

      handleDeepLink('abe-stack://dashboard', mainWindow);

      expect(mocks.show).toHaveBeenCalledTimes(1);
    });

    it('should focus the window', () => {
      const mainWindow = createMockWindow();

      handleDeepLink('abe-stack://dashboard', mainWindow);

      expect(mocks.focus).toHaveBeenCalledTimes(1);
    });

    it('should not call show if window is already visible', () => {
      const mainWindow = createMockWindow();
      mocks.isVisible.mockReturnValue(true);

      handleDeepLink('abe-stack://dashboard', mainWindow);

      expect(mocks.show).not.toHaveBeenCalled();
    });
  });

  describe('registerDeepLinkProtocol', () => {
    it('should register protocol when not already registered', () => {
      mocks.isDefaultProtocolClient.mockReturnValue(false);
      mocks.setAsDefaultProtocolClient.mockReturnValue(true);

      registerDeepLinkProtocol('abe-stack');

      expect(mocks.isDefaultProtocolClient).toHaveBeenCalledWith('abe-stack');
      expect(mocks.setAsDefaultProtocolClient).toHaveBeenCalledWith('abe-stack');
    });

    it('should not re-register if already registered', () => {
      mocks.isDefaultProtocolClient.mockReturnValue(true);

      registerDeepLinkProtocol('abe-stack');

      expect(mocks.setAsDefaultProtocolClient).not.toHaveBeenCalled();
    });

    it('should log warning if registration fails', () => {
      mocks.isDefaultProtocolClient.mockReturnValue(false);
      mocks.setAsDefaultProtocolClient.mockReturnValue(false);

      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      registerDeepLinkProtocol('abe-stack');

      expect(consoleSpy).toHaveBeenCalledWith(
        '[DeepLinks] Failed to register protocol abe-stack://',
      );
      consoleSpy.mockRestore();
    });
  });
});
