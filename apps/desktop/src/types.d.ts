// apps/desktop/src/types.d.ts
import type { NativeBridge } from '@abe-stack/shared';

declare global {
  interface Window {
    electronAPI?: NativeBridge;
  }
}

export {};
