// apps/desktop/src/electron/utils/index.ts
/**
 * Electron Utilities
 *
 * Re-exports utilities from @abe-stack/core/shared.
 * These are Node.js-only utilities for port handling and async operations.
 */

export {
  delay,
  isPortFree,
  isPortListening,
  pickAvailablePort,
  uniquePorts,
  waitForPort,
} from '@abe-stack/core/shared';
