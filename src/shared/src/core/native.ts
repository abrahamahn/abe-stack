// src/shared/src/core/native.ts
/**
 * Native Bridge Interface
 *
 * Defines the contract between web code and native platform APIs.
 * Used by desktop (Electron) and mobile (React Native) apps.
 *
 * @module native
 */

/**
 * Native platform bridge contract.
 *
 * Desktop and mobile apps expose platform-specific APIs (file dialogs,
 * notifications, deep links) through this interface. Web apps can
 * detect the native environment via `isNative()` and conditionally
 * use native features.
 */
export interface NativeBridge {
  /**
   * Get the current platform identifier.
   *
   * @returns Platform string (e.g. 'electron', 'react-native', 'web')
   */
  getPlatform: () => Promise<string>;

  /**
   * Send a native OS notification.
   *
   * @param title - Notification title
   * @param body - Notification body text
   */
  sendNotification: (title: string, body: string) => void;

  /**
   * Check if running in a native environment.
   *
   * @returns True if running inside Electron or React Native
   */
  isNative: () => boolean;

  /**
   * Get the native app version string.
   *
   * @returns Semantic version (e.g. '1.2.3')
   */
  getAppVersion: () => Promise<string>;

  /**
   * Open an external URL in the system browser.
   *
   * @param url - URL to open
   */
  openExternal: (url: string) => Promise<void>;

  /**
   * Show a native file picker dialog.
   *
   * @param options - Dialog configuration
   * @returns Selected file paths, or null if cancelled
   */
  showOpenDialog?: (options: {
    title?: string;
    filters?: Array<{ name: string; extensions: string[] }>;
    multiple?: boolean;
  }) => Promise<string[] | null>;

  /**
   * Show a native save dialog.
   *
   * @param options - Dialog configuration
   * @returns Selected save path, or null if cancelled
   */
  showSaveDialog?: (options: {
    title?: string;
    defaultPath?: string;
    filters?: Array<{ name: string; extensions: string[] }>;
  }) => Promise<string | null>;
}
