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
 * Maps IPC channels to their argument types and return types.
 * Each channel defines the expected args tuple and result type.
 */
export type IPCChannelMap = {
  'get-app-version': { args: []; result: string };
  'show-open-dialog': { args: [OpenDialogOptions]; result: string[] | null };
  'show-save-dialog': { args: [SaveDialogOptions]; result: string | null };
};

/** Union type of all valid IPC channel names */
export type IPCChannel = keyof IPCChannelMap;
