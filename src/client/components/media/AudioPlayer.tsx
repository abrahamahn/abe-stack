import React, { useCallback, useEffect, useRef, useState } from "react";

import { formatDuration } from "../../helpers/formatters";

interface AudioPlayerProps {
  trackUrl: string;
  trackTitle: string;
  artistName: string;
  coverArtUrl?: string;
  autoplay?: boolean;
  onEnded?: () => void;
  onPlay?: () => void;
  onPause?: () => void;
}

const AudioPlayer: React.FC<AudioPlayerProps> = ({
  trackUrl,
  trackTitle,
  artistName,
  coverArtUrl,
  autoplay = false,
  onEnded,
  onPlay,
  onPause,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(0.8);

  const audioRef = useRef<HTMLAudioElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);

  const playAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current
        .play()
        .then(() => {
          setIsPlaying(true);
          if (onPlay) onPlay();
        })
        .catch((error) => {
          console.error("Play failed:", error);
        });
    }
  }, [onPlay]);

  const pauseAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
      if (onPause) onPause();
    }
  }, [onPause]);

  useEffect(() => {
    if (audioRef.current) {
      const audio = audioRef.current;

      const handleLoadedMetadata = () => {
        setDuration(audio.duration);
      };

      const handleTimeUpdate = () => {
        setCurrentTime(audio.currentTime);
      };

      const handleEnded = () => {
        setIsPlaying(false);
        if (onEnded) onEnded();
      };

      // Add event listeners
      audio.addEventListener("loadedmetadata", handleLoadedMetadata);
      audio.addEventListener("timeupdate", handleTimeUpdate);
      audio.addEventListener("ended", handleEnded);

      // Set volume
      audio.volume = volume;

      // Handle autoplay
      if (autoplay) {
        playAudio();
      }

      // Clean up
      return () => {
        audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
        audio.removeEventListener("timeupdate", handleTimeUpdate);
        audio.removeEventListener("ended", handleEnded);
      };
    }
  }, [trackUrl, autoplay, playAudio, pauseAudio, volume, onEnded]);

  const togglePlay = () => {
    if (isPlaying) {
      pauseAudio();
    } else {
      playAudio();
    }
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (progressRef.current && audioRef.current) {
      const progressRect = progressRef.current.getBoundingClientRect();
      const clickPosition = e.clientX - progressRect.left;
      const percentageClicked = clickPosition / progressRect.width;
      const newTime = duration * percentageClicked;

      audioRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);

    if (audioRef.current) {
      audioRef.current.volume = newVolume;
    }
  };

  return (
    <div style={styles.audioPlayer}>
      <audio ref={audioRef} src={trackUrl} preload="metadata" />

      <div className="player-container">
        {coverArtUrl && (
          <div className="cover-art">
            <img src={coverArtUrl} alt={`${trackTitle} by ${artistName}`} />
          </div>
        )}

        <div className="player-controls">
          <div className="track-info">
            <h3 className="track-title">{trackTitle}</h3>
            <p className="artist-name">{artistName}</p>
          </div>

          <div className="controls">
            <button
              className="skip-back"
              aria-label="Skip back 15 seconds"
              onClick={() => {
                if (audioRef.current) {
                  audioRef.current.currentTime = Math.max(0, currentTime - 15);
                }
              }}
            >
              ⏪
            </button>

            <button
              className="play-pause"
              aria-label={isPlaying ? "Pause" : "Play"}
              onClick={togglePlay}
            >
              {isPlaying ? "⏸️" : "▶️"}
            </button>

            <button
              className="skip-forward"
              aria-label="Skip forward 15 seconds"
              onClick={() => {
                if (audioRef.current) {
                  audioRef.current.currentTime = Math.min(
                    duration,
                    currentTime + 15,
                  );
                }
              }}
            >
              ⏩
            </button>
          </div>

          <div className="progress-container">
            <div className="time-display">{formatDuration(currentTime)}</div>

            <div
              className="progress-bar"
              ref={progressRef}
              onClick={handleProgressClick}
            >
              <div
                className="progress-fill"
                style={{ width: `${(currentTime / duration) * 100}%` }}
              ></div>
            </div>

            <div className="time-display">{formatDuration(duration)}</div>
          </div>

          <div className="volume-control">
            <span className="volume-icon">🔊</span>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={volume}
              onChange={handleVolumeChange}
              className="volume-slider"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

const styles = {
  audioPlayer: {
    width: "100%",
    maxWidth: "600px",
    background: "var(--background2)",
    borderRadius: "12px",
    padding: "20px",
    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
    margin: "20px auto",
  },
  playerContainer: {
    display: "flex",
    alignItems: "center",
  },
  coverArt: {
    width: "100px",
    height: "100px",
    marginRight: "20px",
    flexShrink: 0,
  },
  coverArtImg: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    borderRadius: "8px",
  },
  playerControls: {
    flexGrow: 1,
  },
  trackTitle: {
    margin: "0 0 5px 0",
    fontSize: "18px",
    color: "var(--text-color)",
  },
  artistName: {
    margin: 0,
    fontSize: "14px",
    color: "var(--text-color2)",
  },
  controls: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    margin: "15px 0",
  },
  controlsButton: {
    background: "transparent",
    border: "none",
    cursor: "pointer",
    fontSize: "24px",
    padding: "5px 15px",
    borderRadius: "50%",
    transition: "background-color 0.2s",
  },
  controlsButtonHover: {
    backgroundColor: "var(--hover)",
  },
  playPause: {
    margin: "0 15px",
  },
  progressContainer: {
    display: "flex",
    alignItems: "center",
    marginBottom: "15px",
  },
  timeDisplay: {
    fontSize: "12px",
    color: "var(--text-color2)",
    width: "45px",
  },
  progressBar: {
    flexGrow: 1,
    height: "6px",
    backgroundColor: "var(--transparent2)",
    borderRadius: "3px",
    margin: "0 10px",
    cursor: "pointer",
    position: "relative",
  },
  progressFill: {
    position: "absolute",
    top: 0,
    left: 0,
    height: "100%",
    backgroundColor: "var(--blue)",
    borderRadius: "3px",
  },
  volumeControl: {
    display: "flex",
    alignItems: "center",
  },
  volumeIcon: {
    marginRight: "10px",
    fontSize: "16px",
  },
  volumeSlider: {
    "-webkit-appearance": "none",
    width: "100px",
    height: "4px",
    background: "var(--transparent2)",
    borderRadius: "2px",
    outline: "none",
  },
  volumeSliderThumb: {
    "-webkit-appearance": "none",
    width: "12px",
    height: "12px",
    borderRadius: "50%",
    background: "var(--blue)",
    cursor: "pointer",
  },
};

export default AudioPlayer;
