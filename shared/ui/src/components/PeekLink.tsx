// shared/ui/src/components/PeekLink.tsx
/**
 * PeekLink - A link that opens content in a side-peek panel.
 *
 * Works like a regular anchor tag but adds the path to `?peek=` param instead
 * of navigating directly. Use with SidePeek.Root to render the peeked content.
 *
 * @example
 * // Opens /users/123 in side peek
 * <PeekLink to="/users/123">View User</PeekLink>
 *
 * // With custom styling
 * <PeekLink to="/settings" className="text-blue-500">
 *   Open Settings
 * </PeekLink>
 */

import {
  useCallback,
  type ComponentPropsWithoutRef,
  type ReactElement,
  type ReactNode,
} from 'react';

import { useSidePeek } from '../hooks/useSidePeek';

export interface PeekLinkProps extends Omit<ComponentPropsWithoutRef<'a'>, 'href'> {
  /** The path to open in the side peek */
  to: string;
  children: ReactNode;
  /** If true, toggles the peek (closes if already open with same path) */
  toggle?: boolean;
}

export const PeekLink = ({
  to,
  children,
  toggle = false,
  onClick,
  ...props
}: PeekLinkProps): ReactElement => {
  const { open, toggle: togglePeek, peekPath } = useSidePeek();

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>): void => {
      // Allow default behavior for modified clicks
      if (e.metaKey || e.altKey || e.ctrlKey || e.shiftKey || e.button !== 0) {
        return;
      }

      e.preventDefault();
      onClick?.(e);

      if (toggle) {
        togglePeek(to);
      } else {
        open(to);
      }
    },
    [to, toggle, open, togglePeek, onClick],
  );

  // Add visual indicator if this link's path is currently peeked
  const isActive = peekPath === to;

  return (
    <a
      href={`?peek=${encodeURIComponent(to)}`}
      onClick={handleClick}
      data-peek-active={isActive ? '' : undefined}
      {...props}
    >
      {children}
    </a>
  );
};
