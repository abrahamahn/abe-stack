declare module 'dashjs' {
  export interface MediaPlayerSettings {
    streaming: {
      lowLatencyEnabled: boolean;
      abr: {
        initialBitrate: {
          audio: number;
          video: number;
        };
        autoSwitchBitrate: {
          audio: boolean;
          video: boolean;
        };
      };
    };
  }

  export interface MediaPlayer {
    initialize(mediaElement: HTMLElement, source: string, autoPlay: boolean): void;
    updateSettings(settings: MediaPlayerSettings): void;
    on(event: string, callback: (...args: any[]) => void): void;
    destroy(): void;
  }

  export namespace MediaPlayer {
    export function create(): MediaPlayer;
  }
} 