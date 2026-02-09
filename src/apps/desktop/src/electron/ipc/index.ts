// src/apps/desktop/src/electron/ipc/index.ts
export { registerIPCHandlers } from './handlers';
export type {
  DialogFileFilter,
  IPCChannel,
  IPCChannelMap,
  OpenDialogOptions,
  SaveDialogOptions,
} from '../types/ipc';
export { IPC_CHANNELS } from '../types/ipc';
