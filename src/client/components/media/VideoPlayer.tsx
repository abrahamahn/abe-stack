import React, { useEffect, useRef, useState } from "react";

import { formatDuration } from "../../helpers/formatters";
import { videoPlayerStyles } from "../../styles";
import { mergeStyles } from "../../utils/styleUtils";

// Define interface for document with vendor-specific fullscreen properties
interface DocumentWithFullscreen extends Document {
  webkitFullscreenElement?: Element | null;
  mozFullScreenElement?: Element | null;
  webkitExitFullscreen?: () => Promise<void>;
  mozCancelFullScreen?: () => Promise<void>;
}

// Define interface for element with vendor-specific fullscreen methods
interface ElementWithFullscreen extends HTMLDivElement {
  webkitRequestFullscreen?: () => Promise<void>;
  mozRequestFullScreen?: () => Promise<void>;
}

interface VideoSource {
  src: string;
  quality: string;
  type: string;
}

interface VideoPlayerProps {
  sources: VideoSource[];
  poster?: string;
  title?: string;
  autoplay?: boolean;
  loop?: boolean;
  muted?: boolean;
  controls?: boolean;
  width?: number | string;
  height?: number | string;
  onPlay?: () => void;
  onPause?: () => void;
  onEnded?: () => void;
  onTimeUpdate?: (currentTime: number) => void;
  onQualityChange?: (quality: string) => void;
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({
  sources,
  poster,
  title,
  autoplay = false,
  loop = false,
  muted = false,
  controls = true,
  width = "100%",
  height = "auto",
  onPlay,
  onPause,
  onEnded,
  onTimeUpdate,
  onQualityChange,
}) => {
  const [playing, setPlaying] = useState(autoplay);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(muted ? 0 : 1);
  const [showControls, setShowControls] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [selectedQuality, setSelectedQuality] = useState<string>(
    sources[0]?.quality || "auto",
  );
  const [showQualityMenu, setShowQualityMenu] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const playerRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);

  // Sort sources by quality (high to low)
  const sortedSources = [...sources].sort((a, b) => {
    // Extract numeric value from quality string (e.g., '720p' -> 720)
    const qualityA = parseInt(a.quality.replace(/[^\d]/g, ""), 10) || 0;
    const qualityB = parseInt(b.quality.replace(/[^\d]/g, ""), 10) || 0;
    return qualityB - qualityA;
  });

  // Get active source based on selected quality
  const activeSource =
    sortedSources.find((source) => source.quality === selectedQuality) ||
    sortedSources[0];

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);
      if (onTimeUpdate) onTimeUpdate(video.currentTime);
    };

    const handleLoadedMetadata = () => {
      setDuration(video.duration);
    };

    const handlePlay = () => {
      setPlaying(true);
      if (onPlay) onPlay();
    };

    const handlePause = () => {
      setPlaying(false);
      if (onPause) onPause();
    };

    const handleEnded = () => {
      setPlaying(false);
      if (onEnded) onEnded();
    };

    // Set up event listeners
    video.addEventListener("timeupdate", handleTimeUpdate);
    video.addEventListener("loadedmetadata", handleLoadedMetadata);
    video.addEventListener("play", handlePlay);
    video.addEventListener("pause", handlePause);
    video.addEventListener("ended", handleEnded);

    // Set initial volume
    video.volume = volume;

    // Clean up event listeners
    return () => {
      video.removeEventListener("timeupdate", handleTimeUpdate);
      video.removeEventListener("loadedmetadata", handleLoadedMetadata);
      video.removeEventListener("play", handlePlay);
      video.removeEventListener("pause", handlePause);
      video.removeEventListener("ended", handleEnded);
    };
  }, [onPlay, onPause, onEnded, onTimeUpdate, volume]);

  // Handle fullscreen
  useEffect(() => {
    const handleFullscreenChange = () => {
      const doc = document as DocumentWithFullscreen;
      setIsFullscreen(
        Boolean(
          document.fullscreenElement ||
            doc.webkitFullscreenElement ||
            doc.mozFullScreenElement,
        ),
      );
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("webkitfullscreenchange", handleFullscreenChange);
    document.addEventListener("mozfullscreenchange", handleFullscreenChange);

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener(
        "webkitfullscreenchange",
        handleFullscreenChange,
      );
      document.removeEventListener(
        "mozfullscreenchange",
        handleFullscreenChange,
      );
    };
  }, []);

  const togglePlay = () => {
    if (!videoRef.current) return;

    if (playing) {
      videoRef.current.pause();
    } else {
      void videoRef.current.play();
    }
  };

  const seekTo = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressRef.current || !videoRef.current) return;

    const progressRect = progressRef.current.getBoundingClientRect();
    const clickPosition = e.clientX - progressRect.left;
    const seekPercentage = clickPosition / progressRect.width;
    const seekTime = duration * seekPercentage;

    videoRef.current.currentTime = seekTime;
    setCurrentTime(seekTime);
  };

  const changeVolume = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);

    if (videoRef.current) {
      videoRef.current.volume = newVolume;
      videoRef.current.muted = newVolume === 0;
    }
  };

  const toggleMute = () => {
    if (!videoRef.current) return;

    if (volume === 0) {
      // Unmute and restore last volume
      const newVolume = 0.5;
      setVolume(newVolume);
      videoRef.current.volume = newVolume;
      videoRef.current.muted = false;
    } else {
      // Mute
      setVolume(0);
      videoRef.current.volume = 0;
      videoRef.current.muted = true;
    }
  };

  const toggleFullscreen = () => {
    if (!playerRef.current) return;

    if (isFullscreen) {
      const doc = document as DocumentWithFullscreen;
      if (document.exitFullscreen) {
        void document.exitFullscreen();
      } else if (doc.webkitExitFullscreen) {
        void doc.webkitExitFullscreen();
      } else if (doc.mozCancelFullScreen) {
        void doc.mozCancelFullScreen();
      }
    } else {
      const element = playerRef.current as ElementWithFullscreen;
      if (element.requestFullscreen) {
        void element.requestFullscreen();
      } else if (element.webkitRequestFullscreen) {
        void element.webkitRequestFullscreen();
      } else if (element.mozRequestFullScreen) {
        void element.mozRequestFullScreen();
      }
    }
  };

  const changeQuality = (quality: string) => {
    // Remember current playback time
    const currentPlaybackTime = videoRef.current?.currentTime || 0;
    const isPlaying = !videoRef.current?.paused;

    setSelectedQuality(quality);
    setShowQualityMenu(false);

    if (onQualityChange) {
      onQualityChange(quality);
    }

    // Let the video load and then restore playback state
    setTimeout(() => {
      if (videoRef.current) {
        videoRef.current.currentTime = currentPlaybackTime;
        if (isPlaying) {
          void videoRef.current.play();
        }
      }
    }, 0);
  };

  // Format buffered time for the progress bar
  const getBufferedTime = () => {
    if (!videoRef.current) return 0;

    const video = videoRef.current;
    if (video.buffered.length === 0) return 0;

    // Return the end time of the last buffered range
    return video.buffered.end(video.buffered.length - 1);
  };

  return (
    <div
      style={mergeStyles(videoPlayerStyles.videoPlayer as React.CSSProperties, {
        width,
        height,
      })}
      ref={playerRef}
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => setShowControls(false)}
    >
      <div style={videoPlayerStyles.videoContainer as React.CSSProperties}>
        <video
          ref={videoRef}
          style={videoPlayerStyles.videoElement as React.CSSProperties}
          poster={poster}
          autoPlay={autoplay}
          loop={loop}
          muted={muted}
          playsInline
        >
          <source src={activeSource.src} type={activeSource.type} />
          Your browser does not support the video tag.
        </video>

        <div
          style={mergeStyles(
            videoPlayerStyles.videoOverlay as React.CSSProperties,
            showControls || !playing
              ? (videoPlayerStyles.videoOverlayVisible as React.CSSProperties)
              : {},
          )}
          onClick={togglePlay}
        >
          {!playing && (
            <button
              style={videoPlayerStyles.playButton as React.CSSProperties}
              onClick={togglePlay}
              onMouseOver={(e) => {
                Object.assign(e.currentTarget.style, {
                  transform: "scale(1.1)",
                  background: "rgba(0, 0, 0, 0.8)",
                });
              }}
              onMouseOut={(e) => {
                Object.assign(e.currentTarget.style, {
                  transform: "scale(1)",
                  background: "rgba(0, 0, 0, 0.7)",
                });
              }}
            >
              ▶
            </button>
          )}
        </div>

        {controls && (
          <div
            style={mergeStyles(
              videoPlayerStyles.controls as React.CSSProperties,
              showControls || !playing
                ? (videoPlayerStyles.controlsVisible as React.CSSProperties)
                : {},
            )}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={videoPlayerStyles.progressContainer as React.CSSProperties}
              ref={progressRef}
              onClick={seekTo}
            >
              <div
                style={mergeStyles(
                  videoPlayerStyles.progressBar as React.CSSProperties,
                  {
                    width: `${(currentTime / duration) * 100}%`,
                  },
                )}
              />
              <div
                style={mergeStyles(
                  videoPlayerStyles.progressBar as React.CSSProperties,
                  {
                    width: `${(getBufferedTime() / duration) * 100}%`,
                    opacity: 0.3,
                  },
                )}
              />
            </div>

            <div style={videoPlayerStyles.controlsRow as React.CSSProperties}>
              <div
                style={videoPlayerStyles.controlsGroup as React.CSSProperties}
              >
                <button
                  style={videoPlayerStyles.controlButton as React.CSSProperties}
                  onClick={togglePlay}
                  onMouseOver={(e) => {
                    e.currentTarget.style.opacity = "1";
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.opacity = "0.8";
                  }}
                >
                  {playing ? "⏸" : "▶"}
                </button>

                <div
                  style={
                    videoPlayerStyles.volumeContainer as React.CSSProperties
                  }
                >
                  <button
                    style={
                      videoPlayerStyles.controlButton as React.CSSProperties
                    }
                    onClick={toggleMute}
                    onMouseOver={(e) => {
                      e.currentTarget.style.opacity = "1";
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.opacity = "0.8";
                    }}
                  >
                    {volume === 0 ? "🔇" : volume < 0.5 ? "🔉" : "🔊"}
                  </button>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={volume}
                    onChange={changeVolume}
                    style={
                      videoPlayerStyles.volumeSlider as React.CSSProperties
                    }
                  />
                </div>

                <span
                  style={videoPlayerStyles.timeDisplay as React.CSSProperties}
                >
                  {formatDuration(currentTime)} / {formatDuration(duration)}
                </span>
              </div>

              <div
                style={videoPlayerStyles.controlsGroup as React.CSSProperties}
              >
                {sources.length > 1 && (
                  <div style={{ position: "relative" }}>
                    <button
                      style={
                        videoPlayerStyles.controlButton as React.CSSProperties
                      }
                      onClick={() => setShowQualityMenu(!showQualityMenu)}
                      onMouseOver={(e) => {
                        e.currentTarget.style.opacity = "1";
                      }}
                      onMouseOut={(e) => {
                        e.currentTarget.style.opacity = "0.8";
                      }}
                    >
                      {selectedQuality} ⚙️
                    </button>

                    {showQualityMenu && (
                      <div
                        style={{
                          position: "absolute",
                          bottom: "40px",
                          right: "0",
                          background: "rgba(0, 0, 0, 0.8)",
                          borderRadius: "4px",
                          padding: "8px",
                          zIndex: 10,
                        }}
                      >
                        {sortedSources.map((source) => (
                          <div
                            key={source.quality}
                            style={{
                              padding: "5px 10px",
                              cursor: "pointer",
                              color:
                                source.quality === selectedQuality
                                  ? "var(--blue, #1a73e8)"
                                  : "white",
                              fontWeight:
                                source.quality === selectedQuality
                                  ? "bold"
                                  : "normal",
                            }}
                            onClick={() => changeQuality(source.quality)}
                          >
                            {source.quality}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <button
                  style={mergeStyles(
                    videoPlayerStyles.controlButton as React.CSSProperties,
                    videoPlayerStyles.fullscreenButton as React.CSSProperties,
                  )}
                  onClick={toggleFullscreen}
                  onMouseOver={(e) => {
                    e.currentTarget.style.opacity = "1";
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.opacity = "0.8";
                  }}
                >
                  {isFullscreen ? "↙️" : "↗️"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {title && (
        <div
          style={{
            padding: "10px",
            fontSize: "1rem",
            fontWeight: "bold",
            color: "var(--text-color)",
          }}
        >
          {title}
        </div>
      )}
    </div>
  );
};

export default VideoPlayer;
