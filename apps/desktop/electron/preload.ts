// apps/desktop/electron/preload.ts
import { contextBridge } from 'electron';

/**
 * Preload script
 * Exposes safe APIs to the renderer process
 */

contextBridge.exposeInMainWorld('electronAPI', {
  // Add your safe API methods here
  // Example:
  // send: (channel: string, data: any) => ipcRenderer.send(channel, data),
  // receive: (channel: string, func: (...args: any[]) => void) => {
  //   ipcRenderer.on(channel, (event, ...args) => func(...args));
  // },
});

export {};
