// main/apps/desktop/src/electron/types/ipc.ts
/**
 * IPC Channel Type Definitions
 *
 * Provides type safety for Electron IPC communication between
 * the main process and renderer process.
 */

/** File filter for dialog options */
export interface DialogFileFilter {
  name: string;
  extensions: string[];
}

/** Open dialog options (matches NativeBridge.showOpenDialog options) */
export interface OpenDialogOptions {
  title?: string;
  filters?: DialogFileFilter[];
  multiple?: boolean;
}

/** Save dialog options (matches NativeBridge.showSaveDialog options) */
export interface SaveDialogOptions {
  title?: string;
  defaultPath?: string;
  filters?: DialogFileFilter[];
}

/**
 * Actual IPC channel names (kebab-case for wire protocol).
 * Defined as const to ensure type safety.
 */
export const IPC_CHANNELS = {
  getAppVersion: 'get-app-version',
  showOpenDialog: 'show-open-dialog',
  showSaveDialog: 'show-save-dialog',
} as const;

/**
 * Maps IPC channels to their argument types and return types.
 * Each channel defines the expected args tuple and result type.
 * Uses computed property names from IPC_CHANNELS constant.
 */
export type IPCChannelMap = {
  [IPC_CHANNELS.getAppVersion]: { args: []; result: string };
  [IPC_CHANNELS.showOpenDialog]: { args: [OpenDialogOptions]; result: string[] | null };
  [IPC_CHANNELS.showSaveDialog]: { args: [SaveDialogOptions]; result: string | null };
};

/** Union type of all valid IPC channel names */
export type IPCChannel = keyof IPCChannelMap;
