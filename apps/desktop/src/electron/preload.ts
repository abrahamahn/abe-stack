// apps/desktop/src/electron/preload.ts
import { contextBridge, ipcRenderer, shell } from 'electron';

import type { IPCChannel, IPCChannelMap, OpenDialogOptions, SaveDialogOptions } from './types';
import type { NativeBridge } from '@abe-stack/core';

/**
 * Type-safe IPC invoke function.
 * Ensures channel names and arguments match the defined IPCChannelMap.
 */
function invoke<K extends IPCChannel>(
  channel: K,
  ...args: IPCChannelMap[K]['args']
): Promise<IPCChannelMap[K]['result']> {
  return ipcRenderer.invoke(channel, ...args) as Promise<IPCChannelMap[K]['result']>;
}

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

  getAppVersion: () => invoke('get-app-version'),

  openExternal: async (url: string) => {
    await shell.openExternal(url);
  },

  showOpenDialog: (options: OpenDialogOptions) => invoke('show-open-dialog', options),

  showSaveDialog: (options: SaveDialogOptions) => invoke('show-save-dialog', options),
};

contextBridge.exposeInMainWorld('electronAPI', electronBridge);

export {};
