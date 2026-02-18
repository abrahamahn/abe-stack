// main/client/ui/src/components/PeekLink.tsx
import { useSidePeek } from '@bslt/react/hooks';
import {
  useCallback,
  type ComponentPropsWithoutRef,
  type ReactElement,
  type ReactNode,
} from 'react';

export interface PeekLinkProps extends Omit<ComponentPropsWithoutRef<'a'>, 'href'> {
  /** The path to open in the side peek */
  to: string;
  /** Link content (text, icons, or other elements) */
  children: ReactNode;
  /** If true, toggles the peek (closes if already open with same path) */
  toggle?: boolean;
}

/**
 * A link that opens content in a side-peek panel instead of navigating.
 *
 * Renders as a standard `<a>` tag with an `href` pointing to `?peek=<path>`,
 * but intercepts clicks to open the path in the side peek. Modifier-key
 * clicks (Ctrl, Meta, etc.) fall through to default browser behavior.
 *
 * @example
 * ```tsx
 * <PeekLink to="/users/123">View User</PeekLink>
 *
 * // Toggle mode (closes if same path is already open)
 * <PeekLink to="/settings" toggle>Open Settings</PeekLink>
 * ```
 */
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
