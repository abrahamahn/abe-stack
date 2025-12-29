import { forwardRef, type ComponentPropsWithoutRef } from 'react';
import './primitives.css';

type SkeletonProps = ComponentPropsWithoutRef<'div'> & {
  width?: string | number;
  height?: string | number;
  radius?: string | number;
};

export const Skeleton = forwardRef<HTMLDivElement, SkeletonProps>((props, ref) => {
  const { width = '100%', height = '16px', radius = '8px', className = '', style, ...rest } = props;
  return (
    <div
      ref={ref}
      className={`ui-skeleton ${className}`.trim()}
      style={{ width, height, borderRadius: radius, ...style }}
      {...rest}
    />
  );
});

Skeleton.displayName = 'Skeleton';
