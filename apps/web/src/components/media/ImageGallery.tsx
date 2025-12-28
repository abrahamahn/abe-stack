import React, { useCallback, useEffect, useRef, useState } from 'react';

import { imageGalleryStyles } from '../../styles';
import { mergeStyles } from '../../utils/styleUtils';

// Define interface for document with vendor prefixed fullscreen properties
interface DocumentWithFullscreen extends Document {
  webkitFullscreenElement?: Element | null;
  mozFullScreenElement?: Element | null;
  webkitExitFullscreen?: () => Promise<void>;
  mozCancelFullScreen?: () => Promise<void>;
}

interface ElementWithFullscreen extends HTMLElement {
  webkitRequestFullscreen?: () => Promise<void>;
  mozRequestFullScreen?: () => Promise<void>;
}

interface ImageItem {
  src: string;
  width: number;
  height: number;
  alt?: string;
}

interface ImageGalleryProps {
  images: ImageItem[];
  aspectRatio?: number; // width/height ratio, default 1:1 (square)
  showThumbnails?: boolean;
  showNavigation?: boolean;
  initialIndex?: number;
  autoPlay?: boolean;
  autoPlayInterval?: number; // in milliseconds
  onImageChange?: (index: number) => void;
  onClick?: (index: number) => void;
}

const ImageGallery: React.FC<ImageGalleryProps> = ({
  images,
  aspectRatio = 1,
  showThumbnails = true,
  showNavigation = true,
  initialIndex = 0,
  autoPlay = false,
  autoPlayInterval = 3000,
  onImageChange,
  onClick,
}) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [touchStartX, setTouchStartX] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const [swipeDistance, setSwipeDistance] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const galleryRef = useRef<HTMLDivElement>(null);
  const autoPlayRef = useRef<NodeJS.Timeout | null>(null);

  const isSingleImage = images.length === 1;

  // Reset current index if images change
  useEffect(() => {
    setCurrentIndex(initialIndex < images.length ? initialIndex : 0);
  }, [images, initialIndex]);

  const goToNextImage = useCallback(() => {
    setCurrentIndex((prevIndex) => {
      const nextIndex = (prevIndex + 1) % images.length;
      if (onImageChange) onImageChange(nextIndex);
      return nextIndex;
    });
  }, [images.length, onImageChange]);

  // Handle autoplay
  useEffect(() => {
    if (autoPlayRef.current) {
      clearInterval(autoPlayRef.current);
      autoPlayRef.current = null;
    }

    if (autoPlay && images.length > 1) {
      autoPlayRef.current = setInterval(() => {
        goToNextImage();
      }, autoPlayInterval);
    }

    return () => {
      if (autoPlayRef.current) {
        clearInterval(autoPlayRef.current);
      }
    };
  }, [autoPlay, autoPlayInterval, currentIndex, images.length, goToNextImage]);

  // Handle fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(
        Boolean(
          document.fullscreenElement ||
          (document as DocumentWithFullscreen).webkitFullscreenElement ||
          (document as DocumentWithFullscreen).mozFullScreenElement,
        ),
      );
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
    };
  }, []);

  const goToPrevImage = () => {
    setCurrentIndex((prevIndex) => {
      const nextIndex = (prevIndex - 1 + images.length) % images.length;
      if (onImageChange) onImageChange(nextIndex);
      return nextIndex;
    });
  };

  const handleThumbnailClick = (index: number) => {
    setCurrentIndex(index);
    if (onImageChange) onImageChange(index);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartX(e.touches[0].clientX);
    setIsSwiping(true);
    setSwipeDistance(0);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isSwiping) return;

    const currentX = e.touches[0].clientX;
    const distance = currentX - touchStartX;
    setSwipeDistance(distance);
  };

  const handleTouchEnd = () => {
    if (!isSwiping) return;

    if (swipeDistance > 50) {
      goToPrevImage();
    } else if (swipeDistance < -50) {
      goToNextImage();
    }

    setIsSwiping(false);
    setSwipeDistance(0);
  };

  const handleImageClick = () => {
    if (onClick) {
      onClick(currentIndex);
    } else if (images.length > 1 && !isFullscreen) {
      goToNextImage();
    }
  };

  const toggleFullscreen = () => {
    if (!galleryRef.current) return;

    if (isFullscreen) {
      if (document.exitFullscreen) {
        void document.exitFullscreen();
      } else if ((document as DocumentWithFullscreen).webkitExitFullscreen) {
        void (document as DocumentWithFullscreen).webkitExitFullscreen?.();
      } else if ((document as DocumentWithFullscreen).mozCancelFullScreen) {
        void (document as DocumentWithFullscreen).mozCancelFullScreen?.();
      }
    } else {
      if (galleryRef.current.requestFullscreen) {
        void galleryRef.current.requestFullscreen();
      } else if ((galleryRef.current as ElementWithFullscreen).webkitRequestFullscreen) {
        void (galleryRef.current as ElementWithFullscreen).webkitRequestFullscreen?.();
      } else if ((galleryRef.current as ElementWithFullscreen).mozRequestFullScreen) {
        void (galleryRef.current as ElementWithFullscreen).mozRequestFullScreen?.();
      }
    }
  };

  // If no images, return nothing
  if (!images.length) return null;

  return (
    <div style={{ position: 'relative', width: '100%', maxWidth: '100%' }}>
      <div
        ref={galleryRef}
        style={mergeStyles(
          imageGalleryStyles.imageGallery as React.CSSProperties,
          { aspectRatio: aspectRatio.toString() },
          isFullscreen ? (imageGalleryStyles.imageGalleryFullscreen as React.CSSProperties) : {},
        )}
      >
        <div
          style={imageGalleryStyles.galleryMain as React.CSSProperties}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {images.map((image, index) => (
            <div
              key={index}
              style={mergeStyles(imageGalleryStyles.galleryImageContainer as React.CSSProperties, {
                transform: isSwiping
                  ? `translateX(calc(-${currentIndex * 100}% + ${swipeDistance}px))`
                  : `translateX(-${currentIndex * 100}%)`,
              })}
            >
              <img
                src={image.src}
                alt={image.alt || `Image ${index + 1}`}
                style={mergeStyles(
                  imageGalleryStyles.galleryImage as React.CSSProperties,
                  isFullscreen
                    ? (imageGalleryStyles.imageGalleryFullscreenImage as React.CSSProperties)
                    : {},
                )}
                onClick={handleImageClick}
              />
            </div>
          ))}

          {!isSingleImage && showNavigation && (
            <>
              <button
                style={mergeStyles(
                  imageGalleryStyles.galleryNav as React.CSSProperties,
                  imageGalleryStyles.galleryPrev as React.CSSProperties,
                )}
                onClick={goToPrevImage}
                aria-label="Previous image"
                onMouseOver={(e) => {
                  e.currentTarget.style.opacity = '1';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.opacity = '0.7';
                }}
              >
                ◀
              </button>
              <button
                style={mergeStyles(
                  imageGalleryStyles.galleryNav as React.CSSProperties,
                  imageGalleryStyles.galleryNext as React.CSSProperties,
                )}
                onClick={goToNextImage}
                aria-label="Next image"
                onMouseOver={(e) => {
                  e.currentTarget.style.opacity = '1';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.opacity = '0.7';
                }}
              >
                ▶
              </button>
            </>
          )}

          <button
            style={imageGalleryStyles.galleryFullscreen as React.CSSProperties}
            onClick={toggleFullscreen}
            aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
            onMouseOver={(e) => {
              e.currentTarget.style.opacity = '1';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.opacity = '0.7';
            }}
          >
            {isFullscreen ? '↙️' : '↗️'}
          </button>
        </div>

        {!isSingleImage && showThumbnails && (
          <div style={imageGalleryStyles.galleryThumbnails as React.CSSProperties}>
            {images.map((image, index) => (
              <div
                key={index}
                style={mergeStyles(
                  imageGalleryStyles.galleryThumbnail as React.CSSProperties,
                  index === currentIndex
                    ? (imageGalleryStyles.galleryThumbnailActive as React.CSSProperties)
                    : {},
                )}
                onClick={() => handleThumbnailClick(index)}
                onMouseOver={(e) => {
                  if (index !== currentIndex) {
                    e.currentTarget.style.opacity = '0.9';
                  }
                }}
                onMouseOut={(e) => {
                  if (index !== currentIndex) {
                    e.currentTarget.style.opacity = '0.7';
                  }
                }}
              >
                <img
                  src={image.src}
                  alt={`Thumbnail ${index + 1}`}
                  style={imageGalleryStyles.galleryThumbnailImg as React.CSSProperties}
                />
              </div>
            ))}
          </div>
        )}

        {!isSingleImage && (
          <div style={imageGalleryStyles.galleryIndicators as React.CSSProperties}>
            {images.map((_, index) => (
              <button
                key={index}
                style={mergeStyles(
                  imageGalleryStyles.galleryIndicator as React.CSSProperties,
                  index === currentIndex
                    ? (imageGalleryStyles.galleryIndicatorActive as React.CSSProperties)
                    : {},
                )}
                onClick={() => handleThumbnailClick(index)}
                aria-label={`Go to image ${index + 1}`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ImageGallery;
