// src/client/ui/src/elements/Skeleton.tsx
import { forwardRef, type ComponentPropsWithoutRef, type CSSProperties } from 'react';
import '../styles/elements.css';

type SkeletonProps = ComponentPropsWithoutRef<'div'> & {
  /** Width of the skeleton element (CSS value or number for pixels) */
  width?: string | number;
  /** Height of the skeleton element (CSS value or number for pixels) */
  height?: string | number;
  /** Border radius (CSS value or number for pixels) */
  radius?: string | number;
};

/**
 * A loading placeholder that displays an animated skeleton screen.
 *
 * @example
 * ```tsx
 * <Skeleton width={200} height={20} />
 * ```
 */
export const Skeleton = forwardRef<HTMLDivElement, SkeletonProps>((props, ref) => {
  const { width, height, radius, className = '', style, ...rest } = props;
  const cssVars = {
    ...(width !== undefined && {
      ['--skeleton-width']: typeof width === 'number' ? `${String(width)}px` : width,
    }),
    ...(height !== undefined && {
      ['--skeleton-height']: typeof height === 'number' ? `${String(height)}px` : height,
    }),
    ...(radius !== undefined && {
      ['--skeleton-radius']: typeof radius === 'number' ? `${String(radius)}px` : radius,
    }),
  } as CSSProperties;

  return (
    <div
      ref={ref}
      className={`skeleton ${className}`.trim()}
      style={{ ...cssVars, ...style }}
      {...rest}
    />
  );
});

Skeleton.displayName = 'Skeleton';
