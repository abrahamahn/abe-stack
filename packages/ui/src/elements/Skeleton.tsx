// packages/ui/src/elements/Skeleton.tsx
import { forwardRef, type ComponentPropsWithoutRef, type CSSProperties } from 'react';
import '../styles/elements.css';

type SkeletonProps = ComponentPropsWithoutRef<'div'> & {
  width?: string | number;
  height?: string | number;
  radius?: string | number;
};

export const Skeleton = forwardRef<HTMLDivElement, SkeletonProps>((props, ref) => {
  const { width, height, radius, className = '', style, ...rest } = props;
  const cssVars = {
    ...(width !== undefined && {
      '--skeleton-width': typeof width === 'number' ? `${String(width)}px` : width,
    }),
    ...(height !== undefined && {
      '--skeleton-height': typeof height === 'number' ? `${String(height)}px` : height,
    }),
    ...(radius !== undefined && {
      '--skeleton-radius': typeof radius === 'number' ? `${String(radius)}px` : radius,
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
