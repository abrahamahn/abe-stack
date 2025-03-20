import React, { useCallback, useEffect, useRef, useState } from "react";

interface MediaItem {
  id: string;
  src: string;
  type: "image" | "video" | "audio";
  title?: string;
  thumbnail?: string;
  description?: string;
  duration?: number;
}

interface MediaGalleryProps {
  items: MediaItem[];
  columns?: number;
  gap?: number;
  className?: string;
}

export const MediaGallery: React.FC<MediaGalleryProps> = ({
  items,
  columns = 3,
  gap = 16,
  className,
}) => {
  const [selectedItem, setSelectedItem] = useState<MediaItem | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [_isFullscreen, setIsFullscreen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const mediaRef = selectedItem?.type === "video" ? videoRef : audioRef;

  const styles = {
    gallery: {
      display: "grid",
      gridTemplateColumns: `repeat(${columns}, 1fr)`,
      gap: `${gap}px`,
      padding: "16px",
      ...(className && { className }),
    },
    item: {
      position: "relative" as const,
      aspectRatio: "1",
      cursor: "pointer",
      overflow: "hidden",
      borderRadius: "8px",
      backgroundColor: "#f5f5f5",
      transition: "transform 0.2s ease",
      "&:hover": {
        transform: "scale(1.02)",
      },
    },
    thumbnail: {
      width: "100%",
      height: "100%",
      objectFit: "cover" as const,
    },
    overlay: {
      position: "absolute" as const,
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: "rgba(0, 0, 0, 0.5)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      opacity: 0,
      transition: "opacity 0.2s ease",
      "&:hover": {
        opacity: 1,
      },
    },
    title: {
      color: "white",
      fontSize: "1rem",
      fontWeight: 500,
      textAlign: "center" as const,
      padding: "8px",
    },
    modal: {
      position: "fixed" as const,
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: "rgba(0, 0, 0, 0.9)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 1000,
    },
    modalContent: {
      position: "relative" as const,
      maxWidth: "90vw",
      maxHeight: "90vh",
      backgroundColor: "#fff",
      borderRadius: "8px",
      overflow: "hidden",
    },
    closeButton: {
      position: "absolute" as const,
      top: "16px",
      right: "16px",
      backgroundColor: "rgba(0, 0, 0, 0.5)",
      color: "white",
      border: "none",
      borderRadius: "50%",
      width: "32px",
      height: "32px",
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      transition: "background-color 0.2s",
      "&:hover": {
        backgroundColor: "rgba(0, 0, 0, 0.7)",
      },
    },
    media: {
      maxWidth: "100%",
      maxHeight: "90vh",
      objectFit: "contain" as const,
    },
    controls: {
      position: "absolute" as const,
      bottom: 0,
      left: 0,
      right: 0,
      padding: "16px",
      backgroundColor: "rgba(0, 0, 0, 0.7)",
      display: "flex",
      alignItems: "center",
      gap: "16px",
    },
    playButton: {
      backgroundColor: "transparent",
      border: "none",
      color: "white",
      cursor: "pointer",
      padding: "8px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    },
    timeSlider: {
      flex: 1,
      height: "4px",
      backgroundColor: "rgba(255, 255, 255, 0.3)",
      borderRadius: "2px",
      cursor: "pointer",
      "&:hover": {
        backgroundColor: "rgba(255, 255, 255, 0.5)",
      },
    },
    timeFill: {
      height: "100%",
      backgroundColor: "#2196f3",
      borderRadius: "2px",
      width: `${(currentTime / duration) * 100}%`,
    },
    volumeControl: {
      display: "flex",
      alignItems: "center",
      gap: "8px",
    },
    volumeSlider: {
      width: "100px",
      height: "4px",
      backgroundColor: "rgba(255, 255, 255, 0.3)",
      borderRadius: "2px",
      cursor: "pointer",
      "&:hover": {
        backgroundColor: "rgba(255, 255, 255, 0.5)",
      },
    },
    volumeFill: {
      height: "100%",
      backgroundColor: "#2196f3",
      borderRadius: "2px",
      width: `${volume * 100}%`,
    },
    timeDisplay: {
      color: "white",
      fontSize: "0.875rem",
      minWidth: "100px",
    },
  };

  useEffect(() => {
    if (selectedItem) {
      setIsPlaying(false);
      setCurrentTime(0);
      setDuration(0);
      setVolume(1);
      setIsMuted(false);
      setIsFullscreen(false);
    }
  }, [selectedItem]);

  const handleTimeUpdate = useCallback(() => {
    if (mediaRef.current) {
      setCurrentTime(mediaRef.current.currentTime);
    }
  }, [mediaRef]);

  const handleLoadedMetadata = useCallback(() => {
    if (mediaRef.current) {
      setDuration(mediaRef.current.duration);
    }
  }, [mediaRef]);

  const handleEnded = useCallback(() => {
    setIsPlaying(false);
    setCurrentTime(0);
  }, []);

  useEffect(() => {
    const currentMedia = mediaRef.current;

    if (currentMedia) {
      currentMedia.addEventListener("timeupdate", handleTimeUpdate);
      currentMedia.addEventListener("loadedmetadata", handleLoadedMetadata);
      currentMedia.addEventListener("ended", handleEnded);
    }

    return () => {
      if (currentMedia) {
        currentMedia.removeEventListener("timeupdate", handleTimeUpdate);
        currentMedia.removeEventListener(
          "loadedmetadata",
          handleLoadedMetadata,
        );
        currentMedia.removeEventListener("ended", handleEnded);
      }
    };
  }, [mediaRef, handleTimeUpdate, handleLoadedMetadata, handleEnded]);

  const togglePlay = () => {
    if (mediaRef.current) {
      if (isPlaying) {
        void mediaRef.current.pause();
      } else {
        void mediaRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const toggleMute = () => {
    if (mediaRef.current) {
      mediaRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const formatTime = (time: number): string => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  return (
    <>
      <div style={styles.gallery}>
        {items.map((item) => (
          <div
            key={item.id}
            style={styles.item}
            onClick={() => setSelectedItem(item)}
          >
            <img
              src={item.thumbnail || item.src}
              alt={item.title || ""}
              style={styles.thumbnail}
            />
            <div style={styles.overlay}>
              <h3 style={styles.title}>{item.title}</h3>
            </div>
          </div>
        ))}
      </div>

      {selectedItem && (
        <div style={styles.modal} onClick={() => setSelectedItem(null)}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <button
              style={styles.closeButton}
              onClick={() => setSelectedItem(null)}
            >
              ×
            </button>

            {selectedItem.type === "image" ? (
              <img
                src={selectedItem.src}
                alt={selectedItem.title || ""}
                style={styles.media}
              />
            ) : selectedItem.type === "video" ? (
              <video
                ref={videoRef}
                src={selectedItem.src}
                style={styles.media}
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={handleLoadedMetadata}
                onEnded={handleEnded}
              />
            ) : (
              <audio
                ref={audioRef}
                src={selectedItem.src}
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={handleLoadedMetadata}
                onEnded={handleEnded}
              />
            )}

            {(selectedItem.type === "video" ||
              selectedItem.type === "audio") && (
              <div style={styles.controls}>
                <button style={styles.playButton} onClick={togglePlay}>
                  {isPlaying ? "⏸" : "▶"}
                </button>

                <div style={styles.timeSlider}>
                  <div style={styles.timeFill} />
                </div>

                <div style={styles.timeDisplay}>
                  {formatTime(currentTime)} / {formatTime(duration)}
                </div>

                <div style={styles.volumeControl}>
                  <button style={styles.playButton} onClick={toggleMute}>
                    {isMuted ? "🔇" : "🔊"}
                  </button>
                  <div style={styles.volumeSlider}>
                    <div
                      style={{
                        ...styles.volumeFill,
                        width: `${volume * 100}%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};
