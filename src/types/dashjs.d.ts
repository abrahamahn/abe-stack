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
    on(event: string, callback: (...args: unknown[]) => void): void;
    destroy(): void;
  }

  export const MediaPlayer: {
    create(): MediaPlayer;
  };
} 