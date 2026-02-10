// src/apps/web/src/app/tosHandler.ts
/**
 * ToS Handler - Module-level mutable reference for ToS acceptance flow.
 *
 * The API client's onTosRequired callback is set at init time (main.tsx),
 * but the actual UI handler is set later when App.tsx mounts.
 * This module bridges the gap with a simple mutable reference.
 */

import type { TosRequiredPayload } from '@abe-stack/api';

type TosHandler = (payload: TosRequiredPayload) => Promise<void>;

let handler: TosHandler | null = null;

/**
 * Set the ToS handler (called from App.tsx on mount).
 * Returns a cleanup function to unset the handler.
 */
export function setTosHandler(fn: TosHandler): () => void {
  handler = fn;
  return () => {
    handler = null;
  };
}

/**
 * Called by the API client when a 403 TOS_ACCEPTANCE_REQUIRED is received.
 * Delegates to the handler set by the App component.
 */
export async function onTosRequired(payload: TosRequiredPayload): Promise<void> {
  if (handler !== null) {
    return handler(payload);
  }
  // No handler set yet - reject so the error propagates normally
  throw new Error('Terms of Service acceptance required');
}
