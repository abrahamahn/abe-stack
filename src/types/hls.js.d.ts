declare module 'hls.js' {
  export interface HlsConfig {
    maxLoadingDelay: number;
    maxRetryAttempts: number;
    lowLatencyMode: boolean;
  }

  export interface HlsError {
    type: string;
    fatal: boolean;
    details: string;
  }

  export interface Events {
    MANIFEST_PARSED: string;
    ERROR: string;
  }

  export default class Hls {
    static isSupported(): boolean;
    constructor(config?: HlsConfig);
    loadSource(source: string): void;
    attachMedia(media: HTMLMediaElement): void;
    on(event: string, callback: (...args: unknown[]) => void): void;
    destroy(): void;
    startLoad(): void;
    recoverMediaError(): void;
  }

  export const Events: Events;
} 