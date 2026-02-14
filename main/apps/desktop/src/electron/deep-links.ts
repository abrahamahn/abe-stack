// main/apps/desktop/src/electron/deep-links.ts
import { app } from 'electron';

import type { BrowserWindow } from 'electron';

/** Parsed representation of a deep link URL */
export interface DeepLinkPayload {
  path: string;
  query: Record<string, string>;
}

/**
 * Parses a deep link URL into a path and query-string key/value pairs.
 *
 * Custom protocol URLs like `abe-stack://dashboard` are parsed by the
 * URL API with `dashboard` as the hostname and an empty pathname. We
 * combine host + pathname to produce the expected path.
 *
 * @example
 *   parseDeepLinkUrl('abe-stack://settings/profile?tab=security')
 *   // => { path: '/settings/profile', query: { tab: 'security' } }
 */
export function parseDeepLinkUrl(url: string): DeepLinkPayload {
  try {
    const parsed = new URL(url);
    // For custom protocols the "host" portion holds the first path segment
    const stripped = `/${parsed.host}${parsed.pathname}`.replace(/\/+$/, '');
    const rawPath = stripped === '' ? '/' : stripped;
    const query: Record<string, string> = {};

    parsed.searchParams.forEach((value, key) => {
      query[key] = value;
    });

    return { path: rawPath, query };
  } catch {
    // Malformed URLs fall back to root
    return { path: '/', query: {} };
  }
}

/**
 * Sends a parsed deep link to the renderer process via IPC.
 *
 * If the window is destroyed the call is silently ignored.
 *
 * @param url        - The raw deep link URL (e.g. `abe-stack://dashboard`)
 * @param mainWindow - The main BrowserWindow to notify
 */
export function handleDeepLink(url: string, mainWindow: BrowserWindow): void {
  const payload = parseDeepLinkUrl(url);
  console.log(`[DeepLinks] Navigating to ${payload.path}`);

  if (!mainWindow.isDestroyed()) {
    mainWindow.webContents.send('deep-link-navigation', payload);
  }

  // Bring the window to front when a deep link is received
  if (!mainWindow.isVisible()) {
    mainWindow.show();
  }
  mainWindow.focus();
}

/**
 * Registers the app as the default handler for a custom URL protocol
 * (e.g. `abe-stack://`).
 *
 * On macOS this relies on the `open-url` event. On Windows/Linux the URL
 * is passed as a command-line argument on the second instance, so we rely
 * on the `second-instance` event wired in main.ts.
 *
 * @param protocol - The protocol name without the trailing `://`
 */
export function registerDeepLinkProtocol(protocol: string): void {
  if (!app.isDefaultProtocolClient(protocol)) {
    const success = app.setAsDefaultProtocolClient(protocol);
    if (success) {
      console.log(`[DeepLinks] Registered as handler for ${protocol}://`);
    } else {
      console.warn(`[DeepLinks] Failed to register protocol ${protocol}://`);
    }
  } else {
    console.log(`[DeepLinks] Already registered as handler for ${protocol}://`);
  }
}
