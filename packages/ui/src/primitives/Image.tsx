import { forwardRef, useState, type ComponentPropsWithoutRef, type ReactNode } from 'react';
import './primitives.css';

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

  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const handleLoad = (e: React.SyntheticEvent<HTMLImageElement>): void => {
    setIsLoading(false);
    onLoad?.(e);
  };

  const handleError = (e: React.SyntheticEvent<HTMLImageElement>): void => {
    setIsLoading(false);
    setHasError(true);
    onError?.(e);
  };

  const showFallback = (isLoading || hasError) && fallback;

  return (
    <div
      className={`ui-image-container ${className}`.trim()}
      style={{
        position: 'relative',
        aspectRatio: aspectRatio || 'auto',
        overflow: 'hidden',
        ...style,
      }}
    >
      {showFallback ? (
        <div className="ui-image-fallback" style={{ width: '100%', height: '100%' }}>
          {fallback}
        </div>
      ) : null}
      <img
        ref={ref}
        src={src}
        alt={alt}
        loading={loading}
        onLoad={handleLoad}
        onError={handleError}
        className="ui-image"
        style={{
          width: '100%',
          height: '100%',
          objectFit,
          display: showFallback ? 'none' : 'block',
        }}
        {...rest}
      />
    </div>
  );
});

Image.displayName = 'Image';
