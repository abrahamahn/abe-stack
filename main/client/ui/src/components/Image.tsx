// main/client/ui/src/components/Image.tsx
import {
  forwardRef,
  useState,
  type ComponentPropsWithoutRef,
  type ReactNode,
} from 'react';
import '../styles/elements.css';

type ImageProps = Omit<ComponentPropsWithoutRef<'img'>, 'loading'> & {
  /**
   * Image source URL
   */
  src: string;
  /**
   * Alt text for accessibility (required)
   */
  alt: string;
  /**
   * Lazy loading behavior
   * @default 'lazy'
   */
  loading?: 'lazy' | 'eager';
  /**
   * Fallback content to show while loading or on error
   */
  fallback?: ReactNode;
  /**
   * Aspect ratio (e.g., '16/9', '4/3', '1/1')
   */
  aspectRatio?: string;
  /**
   * Object fit behavior
   * @default 'cover'
   */
  objectFit?: 'contain' | 'cover' | 'fill' | 'none' | 'scale-down';
};

/**
 * Image component with lazy loading, fallback support, and aspect ratio control.
 *
 * @example
 * ```tsx
 * <Image
 *   src="/photo.jpg"
 *   alt="Photo description"
 *   aspectRatio="16/9"
 *   fallback={<Skeleton />}
 * />
 * ```
 */
export const Image = forwardRef<HTMLImageElement, ImageProps>((props, ref) => {
  const {
    src,
    alt,
    loading = 'lazy',
    fallback,
    aspectRatio,
    objectFit = 'cover',
    className = '',
    style,
    onLoad,
    onError,
    ...rest
  } = props;

  // Track which src was last loaded to detect changes without effects or refs.
  // React supports calling setState during render when derived from a previous render's state.
  const [loadedSrc, setLoadedSrc] = useState(src);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  if (loadedSrc !== src) {
    setLoadedSrc(src);
    setIsLoading(true);
    setHasError(false);
  }

  const handleLoad = (e: React.SyntheticEvent<HTMLImageElement>): void => {
    setIsLoading(false);
    onLoad?.(e);
  };

  const handleError = (e: React.SyntheticEvent<HTMLImageElement>): void => {
    setIsLoading(false);
    setHasError(true);
    onError?.(e);
  };

  const showFallback = (isLoading || hasError) && fallback != null;

  return (
    <div
      className={`image-container ${className}`.trim()}
      style={{
        aspectRatio: aspectRatio != null && aspectRatio !== '' ? aspectRatio : 'auto',
        ...style,
      }}
    >
      {showFallback ? <div className="image-fallback">{fallback}</div> : null}
      <img
        ref={ref}
        src={src}
        alt={alt}
        loading={loading}
        onLoad={handleLoad}
        onError={handleError}
        className="image"
        style={{
          objectFit,
          display: showFallback ? 'none' : 'block',
        }}
        {...rest}
      />
    </div>
  );
});

Image.displayName = 'Image';
