// src/apps/desktop/src/electron/auto-updater.test.ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  autoUpdaterOn: vi.fn(),
  autoUpdaterCheckForUpdates: vi.fn(),
  webContentsSend: vi.fn(),
  isDestroyed: vi.fn().mockReturnValue(false),
}));

vi.mock('electron', () => ({
  autoUpdater: {
    on: mocks.autoUpdaterOn,
    checkForUpdates: mocks.autoUpdaterCheckForUpdates,
  },
}));

import { initAutoUpdater } from './auto-updater';

import type { BrowserWindow } from 'electron';

function createMockWindow(): BrowserWindow {
  return {
    isDestroyed: mocks.isDestroyed,
    webContents: {
      send: mocks.webContentsSend,
    },
  } as unknown as BrowserWindow;
}

describe('initAutoUpdater', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should register update-available event listener', () => {
    const mainWindow = createMockWindow();
    initAutoUpdater(mainWindow);

    expect(mocks.autoUpdaterOn).toHaveBeenCalledWith('update-available', expect.any(Function));
  });

  it('should register update-downloaded event listener', () => {
    const mainWindow = createMockWindow();
    initAutoUpdater(mainWindow);

    expect(mocks.autoUpdaterOn).toHaveBeenCalledWith('update-downloaded', expect.any(Function));
  });

  it('should register error event listener', () => {
    const mainWindow = createMockWindow();
    initAutoUpdater(mainWindow);

    expect(mocks.autoUpdaterOn).toHaveBeenCalledWith('error', expect.any(Function));
  });

  it('should check for updates immediately on init', () => {
    const mainWindow = createMockWindow();
    initAutoUpdater(mainWindow);

    expect(mocks.autoUpdaterCheckForUpdates).toHaveBeenCalledTimes(1);
  });

  it('should check for updates every 4 hours', () => {
    const mainWindow = createMockWindow();
    initAutoUpdater(mainWindow);

    mocks.autoUpdaterCheckForUpdates.mockClear();

    // Advance 4 hours
    vi.advanceTimersByTime(4 * 60 * 60 * 1000);
    expect(mocks.autoUpdaterCheckForUpdates).toHaveBeenCalledTimes(1);

    // Advance another 4 hours
    vi.advanceTimersByTime(4 * 60 * 60 * 1000);
    expect(mocks.autoUpdaterCheckForUpdates).toHaveBeenCalledTimes(2);
  });

  it('should send update-available to renderer when update is available', () => {
    const mainWindow = createMockWindow();
    initAutoUpdater(mainWindow);

    const updateAvailableHandler = mocks.autoUpdaterOn.mock.calls.find(
      (call) => call[0] ==='update-available',
    )![1] as () => void;

    updateAvailableHandler();

    expect(mocks.webContentsSend).toHaveBeenCalledWith('update-available');
  });

  it('should send update-ready to renderer when update is downloaded', () => {
    const mainWindow = createMockWindow();
    initAutoUpdater(mainWindow);

    const updateDownloadedHandler = mocks.autoUpdaterOn.mock.calls.find(
      (call) => call[0] ==='update-downloaded',
    )![1] as (_event: unknown, _notes: unknown, name: string) => void;

    updateDownloadedHandler(null, null, 'v2.0.0');

    expect(mocks.webContentsSend).toHaveBeenCalledWith('update-ready', { version: 'v2.0.0' });
  });

  it('should not send to renderer if window is destroyed', () => {
    const mainWindow = createMockWindow();
    mocks.isDestroyed.mockReturnValue(true);
    initAutoUpdater(mainWindow);

    const updateAvailableHandler = mocks.autoUpdaterOn.mock.calls.find(
      (call) => call[0] ==='update-available',
    )![1] as () => void;

    updateAvailableHandler();

    expect(mocks.webContentsSend).not.toHaveBeenCalled();
  });

  it('should handle checkForUpdates throwing (no feed URL set)', () => {
    mocks.autoUpdaterCheckForUpdates.mockImplementation(() => {
      throw new Error('Update feed URL not set');
    });

    const mainWindow = createMockWindow();
    // Should not throw
    expect(() => {
      initAutoUpdater(mainWindow);
    }).not.toThrow();
  });

  it('should log error on updater error event without crashing', () => {
    const mainWindow = createMockWindow();
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    initAutoUpdater(mainWindow);

    const errorHandler = mocks.autoUpdaterOn.mock.calls.find(
      (call) => call[0] ==='error',
    )![1] as (error: Error) => void;

    errorHandler(new Error('Network failure'));

    expect(consoleSpy).toHaveBeenCalledWith('[AutoUpdater] Error:', 'Network failure');
    consoleSpy.mockRestore();
  });
});
