// src/client/ui/src/elements/Avatar.tsx
import { forwardRef, type ComponentPropsWithoutRef } from 'react';

import { cn } from '../utils/cn';

import '../styles/elements.css';

type AvatarProps = ComponentPropsWithoutRef<'div'> & {
  /** Image source URL */
  src?: string;
  /** Alt text for the avatar image (required for accessibility when src is provided) */
  alt?: string;
  /** Fallback text to display when no image is provided (typically initials) */
  fallback?: string;
};

/**
 * A component for displaying user avatars with support for images and text fallbacks.
 *
 * @example
 * ```tsx
 * <Avatar src="/avatar.jpg" alt="John Doe" fallback="JD" />
 * ```
 */
export const Avatar = forwardRef<HTMLDivElement, AvatarProps>((props, ref) => {
  const { src, alt, fallback, className, ...rest } = props;

  // Provide a default alt text for accessibility if none is given
  const imageAlt =
    alt ?? (fallback != null && fallback !== '' ? `Avatar for ${fallback}` : 'User avatar');

  return (
    <div
      ref={ref}
      className={cn('avatar', className)}
      role="img"
      aria-label={
        (src == null || src === '') && fallback != null && fallback !== '' ? imageAlt : undefined
      }
      {...rest}
    >
      {src != null && src !== '' ? (
        <img src={src} alt={imageAlt} />
      ) : fallback != null && fallback !== '' ? (
        <span aria-hidden="true">{fallback}</span>
      ) : null}
    </div>
  );
});

Avatar.displayName = 'Avatar';
