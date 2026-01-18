// packages/core/src/contracts/native.ts
/**
 * Native Bridge Interface
 *
 * Defines the contract between web code and native platform APIs.
 * Used by desktop (Electron) and mobile (React Native) apps.
 */

export interface NativeBridge {
  /** Get the current platform (electron, react-native, web) */
  getPlatform: () => Promise<string>;

  /** Send a native notification */
  sendNotification: (title: string, body: string) => void;

  /** Check if running in native environment */
  isNative: () => boolean;

  /** Get app version */
  getAppVersion: () => Promise<string>;

  /** Open external URL in system browser */
  openExternal: (url: string) => Promise<void>;

  /** Show native file picker dialog */
  showOpenDialog?: (options: {
    title?: string;
    filters?: Array<{ name: string; extensions: string[] }>;
    multiple?: boolean;
  }) => Promise<string[] | null>;

  /** Show native save dialog */
  showSaveDialog?: (options: {
    title?: string;
    defaultPath?: string;
    filters?: Array<{ name: string; extensions: string[] }>;
  }) => Promise<string | null>;
}

/**
 * Default web implementation (no-op for non-native environments)
 */
export const webBridge: NativeBridge = {
  getPlatform: async () => 'web',
  sendNotification: (title, body) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, { body });
    }
  },
  isNative: () => false,
  getAppVersion: async () => '0.0.0',
  openExternal: async (url) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  },
};
