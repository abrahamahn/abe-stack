// client/ui/src/elements/SkipLink.tsx
import { forwardRef, useCallback, type ComponentPropsWithoutRef } from 'react';

import '../styles/elements.css';

/**
 * Props for the SkipLink component.
 *
 * @param targetId - ID of the element to skip to (default: 'main-content')
 * @param label - Visible text for the skip link (default: 'Skip to main content')
 */
type SkipLinkProps = Omit<ComponentPropsWithoutRef<'a'>, 'href'> & {
  /** ID of the target element to focus (default: 'main-content') */
  targetId?: string;
  /** Visible text label (default: 'Skip to main content') */
  label?: string;
};

/**
 * Accessible skip navigation link for keyboard users.
 *
 * Visually hidden until focused (via Tab key), then appears at the top
 * of the viewport. Clicking or pressing Enter moves focus to the target
 * element, allowing keyboard users to bypass repetitive navigation.
 *
 * @param props - SkipLink component props
 * @returns An anchor element that skips to the target content
 *
 * @example
 * ```tsx
 * // In your app shell, before the main navigation:
 * <SkipLink />
 * <nav>...</nav>
 * <main id="main-content">...</main>
 *
 * // With custom target and label:
 * <SkipLink targetId="content" label="Skip to content" />
 * ```
 */
export const SkipLink = forwardRef<HTMLAnchorElement, SkipLinkProps>((props, ref) => {
  const {
    targetId = 'main-content',
    label = 'Skip to main content',
    className = '',
    ...rest
  } = props;

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>): void => {
      e.preventDefault();
      const target = document.getElementById(targetId);
      if (target !== null) {
        target.setAttribute('tabindex', '-1');
        target.focus();
        target.removeAttribute('tabindex');
      }
    },
    [targetId],
  );

  return (
    <a
      ref={ref}
      href={`#${targetId}`}
      className={`skip-link ${className}`.trim()}
      onClick={handleClick}
      {...rest}
    >
      {label}
    </a>
  );
});

SkipLink.displayName = 'SkipLink';
