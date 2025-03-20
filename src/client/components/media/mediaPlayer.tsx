// Import built-in modules first, then external packages
import React, { useEffect, useRef, useState } from "react";
// Import Plyr CSS
import "plyr/dist/plyr.css";

// Define interfaces for the player types
interface PlyrInstance {
  on(event: string, callback: (...args: unknown[]) => void): void;
  destroy(): void;
  currentTime?: number;
}

interface HlsInstance {
  loadSource(src: string): void;
  attachMedia(media: HTMLMediaElement): void;
  on(event: string, callback: (...args: unknown[]) => void): void;
  startLoad(): void;
  recoverMediaError(): void;
  destroy(): void;
}

// For dynamic imports and type safety
interface HlsConstructor {
  new (config?: Record<string, unknown>): HlsInstance;
  isSupported(): boolean;
}

// Dynamic imports for the actual implementations
const loadPlyr = () => import("plyr").then((m) => m.default);
const loadHls = () =>
  import("hls.js").then((m) => {
    const Hls = m.default as unknown as HlsConstructor;
    return { Hls, Events: m.Events };
  });

interface MediaPlayerProps {
  src: string;
  type: "video" | "audio";
  poster?: string;
  title?: string;
  autoplay?: boolean;
  muted?: boolean;
  crossOrigin?: "anonymous" | "use-credentials";
  onReady?: () => void;
  onPlay?: () => void;
  onPause?: () => void;
  onEnded?: () => void;
  onTimeUpdate?: (currentTime: number) => void;
  onError?: (error: unknown) => void;
  className?: string;
}

interface HlsError {
  type: string;
  fatal: boolean;
  details: string;
}

export const MediaPlayer: React.FC<MediaPlayerProps> = ({
  src,
  type,
  poster,
  title,
  autoplay = false,
  muted = false,
  crossOrigin = "anonymous",
  onReady,
  onPlay,
  onPause,
  onEnded,
  onTimeUpdate,
  onError,
  className,
}: MediaPlayerProps) => {
  const mediaRef = useRef<HTMLVideoElement | HTMLAudioElement>(null);
  const playerRef = useRef<PlyrInstance | null>(null);
  const hlsRef = useRef<HlsInstance | null>(null);

  const [_isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!mediaRef.current) return;

    // Initialize Plyr
    void loadPlyr().then((PlyrConstructor) => {
      if (!mediaRef.current) return;

      playerRef.current = new PlyrConstructor(mediaRef.current, {
        controls: [
          "play-large",
          "play",
          "progress",
          "current-time",
          "mute",
          "volume",
          "captions",
          "settings",
          "pip",
          "airplay",
          "fullscreen",
        ],
        settings: ["quality", "speed", "loop"],
        quality: {
          default: 720,
          options: [1080, 720, 480, 360, 240],
        },
        speed: {
          selected: 1,
          options: [0.5, 0.75, 1, 1.25, 1.5, 2],
        },
      });

      // Set up event listeners
      playerRef.current.on("ready", () => {
        setIsReady(true);
        onReady?.();
      });

      playerRef.current.on("play", () => onPlay?.());
      playerRef.current.on("pause", () => onPause?.());
      playerRef.current.on("ended", () => onEnded?.());
      playerRef.current.on("timeupdate", () => {
        onTimeUpdate?.(playerRef.current?.currentTime || 0);
      });
      playerRef.current.on("error", (error: unknown) => {
        setError(error instanceof Error ? error.message : "Unknown error");
        onError?.(error);
      });
    });

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
      }
      if (playerRef.current) {
        playerRef.current.destroy();
      }
    };
  }, [onEnded, onError, onPause, onPlay, onReady, onTimeUpdate]);

  useEffect(() => {
    if (!mediaRef.current || !src) return;

    const setupHLS = async () => {
      const { Hls, Events } = await loadHls();
      if (Hls.isSupported()) {
        hlsRef.current = new Hls({
          maxLoadingDelay: 4,
          maxMaxBufferLength: 30,
          lowLatencyMode: true,
        });

        if (mediaRef.current && hlsRef.current) {
          hlsRef.current.loadSource(src);
          hlsRef.current.attachMedia(mediaRef.current);

          hlsRef.current.on(Events.MANIFEST_PARSED, () => {
            if (autoplay && mediaRef.current) {
              mediaRef.current.play().catch(() => {
                // Autoplay failed, do nothing
              });
            }
          });

          hlsRef.current.on(Events.ERROR, (...args: unknown[]) => {
            const data = args[1] as HlsError;
            if (data.fatal) {
              switch (data.type) {
                case "networkError":
                  hlsRef.current?.startLoad();
                  break;
                case "mediaError":
                  hlsRef.current?.recoverMediaError();
                  break;
                default:
                  setError("Fatal HLS error");
                  onError?.(data);
                  break;
              }
            }
          });
        }
      } else if (
        mediaRef.current?.canPlayType("application/vnd.apple.mpegurl")
      ) {
        // Native HLS support (Safari)
        mediaRef.current.src = src;
      }
    };

    // Clean up previous instances
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    // Set up new source
    if (src.includes(".m3u8")) {
      void setupHLS();
    } else {
      mediaRef.current.src = src;
    }
  }, [src, autoplay, onError]);

  const containerStyle: React.CSSProperties = {
    position: "relative",
    width: "100%",
    maxWidth: "100%",
    backgroundColor: "#000",
    aspectRatio: type === "video" ? "16/9" : "auto",
  };

  const mediaStyle: React.CSSProperties = {
    width: "100%",
    height: type === "video" ? "100%" : "auto",
  };

  const errorStyle: React.CSSProperties = {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    color: "#fff",
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    padding: "1rem",
    borderRadius: "4px",
    textAlign: "center",
  };

  return (
    <div style={containerStyle} className={className}>
      {type === "video" ? (
        <video
          ref={mediaRef as React.LegacyRef<HTMLVideoElement>}
          poster={poster}
          muted={muted}
          crossOrigin={crossOrigin}
          style={mediaStyle}
          title={title}
        >
          {error && <div style={errorStyle}>{error}</div>}
        </video>
      ) : (
        <audio
          ref={mediaRef as React.LegacyRef<HTMLAudioElement>}
          muted={muted}
          crossOrigin={crossOrigin}
          style={mediaStyle}
          title={title}
        >
          {error && <div style={errorStyle}>{error}</div>}
        </audio>
      )}
    </div>
  );
};
