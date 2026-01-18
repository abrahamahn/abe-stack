// apps/desktop/src/electron/preload.ts
import { contextBridge, ipcRenderer, shell } from 'electron';

import type { NativeBridge } from '@abe-stack/core';

/**
 * Preload script
 * Exposes safe APIs to the renderer process via NativeBridge interface
 */

const electronBridge: NativeBridge = {
  getPlatform: async () => 'electron',

  sendNotification: (title: string, body: string) => {
    // Use Electron's notification API via IPC
    ipcRenderer.send('show-notification', { title, body });
  },

  isNative: () => true,

  getAppVersion: async () => {
    const version = await ipcRenderer.invoke('get-app-version');
    return version as string;
  },

  openExternal: async (url: string) => {
    await shell.openExternal(url);
  },

  showOpenDialog: async (options) => {
    const result = await ipcRenderer.invoke('show-open-dialog', options);
    return result as string[] | null;
  },

  showSaveDialog: async (options) => {
    const result = await ipcRenderer.invoke('show-save-dialog', options);
    return result as string | null;
  },
};

contextBridge.exposeInMainWorld('electronAPI', electronBridge);

export {};
