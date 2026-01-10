// packages/ui/src/elements/Avatar.tsx
import { forwardRef, type ComponentPropsWithoutRef } from 'react';
import '../styles/elements.css';

type AvatarProps = ComponentPropsWithoutRef<'div'> & {
  src?: string;
  alt?: string;
  fallback?: string;
};

export const Avatar = forwardRef<HTMLDivElement, AvatarProps>((props, ref) => {
  const { src, alt, fallback, className = '', ...rest } = props;

  return (
    <div ref={ref} className={`avatar ${className}`.trim()} {...rest}>
      {src ? <img src={src} alt={alt} /> : fallback || null}
    </div>
  );
});

Avatar.displayName = 'Avatar';
