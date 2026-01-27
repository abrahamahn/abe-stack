// apps/desktop/src/electron/types/ipc.ts
import type { NativeBridge } from '@abe-stack/core';

/**
 * IPC Channel Type Definitions
 *
 * Provides type safety for Electron IPC communication between
 * the main process and renderer process.
 */

/** Open dialog options extracted from NativeBridge */
export type OpenDialogOptions = Parameters<NonNullable<NativeBridge['showOpenDialog']>>[0];

/** Save dialog options extracted from NativeBridge */
export type SaveDialogOptions = Parameters<NonNullable<NativeBridge['showSaveDialog']>>[0];

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
