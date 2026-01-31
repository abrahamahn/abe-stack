// shared/ui/src/hooks/useSidePeek.ts
/**
 * useSidePeek - Hook for managing Notion-style side-peek state with URL sync.
 *
 * The peek state is stored in the URL search params (e.g., `?peek=/users/123`).
 * This allows deep-linking to peeked content and proper back/forward navigation.
 *
 * @example
 * function App() {
 *   const { isOpen, peekPath, open, close } = useSidePeek();
 *
 *   return (
 *     <>
 *       <button onClick={() => open('/users/123')}>View User</button>
 *
 *       <SidePeek.Root open={isOpen} onClose={close}>
 *         <SidePeek.Content>
 *           {peekPath === '/users/123' && <UserPage />}
 *         </SidePeek.Content>
 *       </SidePeek.Root>
 *     </>
 *   );
 * }
 */

import { useCallback, useMemo } from 'react';

import { useLocation, useNavigate } from '../router';

const PEEK_PARAM = 'peek';

export interface UseSidePeekResult {
  /** Whether the side peek is currently open */
  isOpen: boolean;
  /** The path being peeked (null if not open) */
  peekPath: string | null;
  /** Open the side peek with the given path */
  open: (path: string) => void;
  /** Close the side peek */
  close: () => void;
  /** Toggle the side peek for the given path */
  toggle: (path: string) => void;
}

export function useSidePeek(): UseSidePeekResult {
  const location = useLocation();
  const navigate = useNavigate();

  const searchParams = useMemo(() => new URLSearchParams(location.search), [location.search]);

  const peekPath = searchParams.get(PEEK_PARAM);
  const isOpen = peekPath !== null;

  const open = useCallback(
    (path: string): void => {
      const newParams = new URLSearchParams(location.search);
      newParams.set(PEEK_PARAM, path);
      const url = `${location.pathname}?${newParams.toString()}${location.hash}`;
      navigate(url);
    },
    [location.pathname, location.search, location.hash, navigate],
  );

  const close = useCallback((): void => {
    const newParams = new URLSearchParams(location.search);
    newParams.delete(PEEK_PARAM);
    const search = newParams.toString();
    const url = `${location.pathname}${search !== '' ? `?${search}` : ''}${location.hash}`;
    navigate(url);
  }, [location.pathname, location.search, location.hash, navigate]);

  const toggle = useCallback(
    (path: string): void => {
      if (peekPath === path) {
        close();
      } else {
        open(path);
      }
    },
    [peekPath, open, close],
  );

  return { isOpen, peekPath, open, close, toggle };
}
