// apps/desktop/src/types.d.ts
import type { NativeBridge } from '@abe-stack/core';

declare global {
  interface Window {
    electronAPI?: NativeBridge;
  }
}

export {};
