declare module 'plyr' {
  export interface PlyrOptions {
    controls?: string[];
    settings?: string[];
    quality?: {
      default: number;
      options: number[];
    };
    speed?: {
      selected: number;
      options: number[];
    };
  }

  export interface Player {
    on(event: string, callback: (...args: unknown[]) => void): void;
    destroy(): void;
    currentTime: number;
  }

  export default class Plyr {
    constructor(target: HTMLElement, options?: PlyrOptions);
    on(event: string, callback: (...args: unknown[]) => void): void;
    destroy(): void;
    currentTime: number;
  }
} 