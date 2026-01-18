// apps/desktop/src/electron/preload.ts
import { contextBridge, ipcRenderer, shell } from 'electron';

import type { NativeBridge } from '@abe-stack/core';

type OpenDialogOptions = Parameters<NonNullable<NativeBridge['showOpenDialog']>>[0];
type SaveDialogOptions = Parameters<NonNullable<NativeBridge['showSaveDialog']>>[0];

const invoke = (channel: string, ...args: unknown[]): Promise<unknown> => {
  return ipcRenderer.invoke(channel, ...args) as Promise<unknown>;
};

/**
 * Preload script
 * Exposes safe APIs to the renderer process via NativeBridge interface
 */

const electronBridge: NativeBridge = {
  getPlatform: () => Promise.resolve('electron'),

  sendNotification: (title: string, body: string) => {
    // Use Electron's notification API via IPC
    ipcRenderer.send('show-notification', { title, body });
  },

  isNative: () => true,

  getAppVersion: async () => {
    const version = await invoke('get-app-version');
    if (typeof version !== 'string') {
      throw new Error('Invalid app version');
    }
    return version;
  },

  openExternal: async (url: string) => {
    await shell.openExternal(url);
  },

  showOpenDialog: async (options: OpenDialogOptions) => {
    const result = await invoke('show-open-dialog', options);
    if (result === null) {
      return null;
    }
    if (Array.isArray(result) && result.every((item) => typeof item === 'string')) {
      return result;
    }
    return null;
  },

  showSaveDialog: async (options: SaveDialogOptions) => {
    const result = await invoke('show-save-dialog', options);
    if (result === null) {
      return null;
    }
    if (typeof result === 'string') {
      return result;
    }
    return null;
  },
};

contextBridge.exposeInMainWorld('electronAPI', electronBridge);

export {};
