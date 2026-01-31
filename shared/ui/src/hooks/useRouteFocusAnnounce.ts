// shared/ui/src/hooks/useRouteFocusAnnounce.ts
import { useAnnounce } from '@components/LiveRegion';
import { useEffect, useRef } from 'react';

import { useLocation } from '../router';

/**
 * Options for the useRouteFocusAnnounce hook.
 *
 * @param getTitle - Function to derive a page title from the pathname
 * @param focusMainOnChange - Whether to move focus to the main content element on route change
 * @param mainContentId - ID of the main content element (default: 'main-content')
 */
export interface UseRouteFocusAnnounceOptions {
  /** Derive a human-readable title from the current pathname */
  getTitle?: (pathname: string) => string;
  /** Move focus to the main content element on route change (default: false) */
  focusMainOnChange?: boolean;
  /** ID of the main content element (default: 'main-content') */
  mainContentId?: string;
}

/**
 * Converts a URL pathname to a human-readable page title.
 *
 * Extracts the last meaningful segment from the path and formats it
 * with Title Case. Falls back to 'Home' for the root path.
 *
 * @param pathname - URL pathname (e.g., '/settings/billing')
 * @returns Human-readable title (e.g., 'Billing')
 * @complexity O(n) where n is the number of path segments
 */
function defaultGetTitle(pathname: string): string {
  const segments = pathname.split('/').filter((s) => s.length > 0);
  if (segments.length === 0) {
    return 'Home';
  }
  const last = segments[segments.length - 1] ?? 'Page';
  return last.charAt(0).toUpperCase() + last.slice(1).replace(/-/g, ' ');
}

/**
 * Announces route changes to screen readers and optionally moves focus
 * to the main content area.
 *
 * Listens to pathname changes from the router and uses the `useAnnounce`
 * hook to communicate the new page title to assistive technology.
 * Must be used within both a `<LiveRegion>` and a router provider.
 *
 * @param options - Configuration options
 *
 * @example
 * ```tsx
 * function AppRoutes() {
 *   useRouteFocusAnnounce();
 *   return <Routes>...</Routes>;
 * }
 *
 * // With custom title derivation:
 * useRouteFocusAnnounce({
 *   getTitle: (pathname) => routeTitles[pathname] ?? 'Page',
 *   focusMainOnChange: true,
 * });
 * ```
 */
export function useRouteFocusAnnounce(options: UseRouteFocusAnnounceOptions = {}): void {
  const {
    getTitle = defaultGetTitle,
    focusMainOnChange = false,
    mainContentId = 'main-content',
  } = options;

  const { announce } = useAnnounce();
  const location = useLocation();
  const previousPathnameRef = useRef(location.pathname);

  useEffect(() => {
    // Skip the initial mount — only announce subsequent navigations
    if (previousPathnameRef.current === location.pathname) {
      return;
    }
    previousPathnameRef.current = location.pathname;

    const title = getTitle(location.pathname);
    announce(`Navigated to ${title}`);

    if (focusMainOnChange) {
      const mainEl = document.getElementById(mainContentId);
      if (mainEl !== null) {
        mainEl.setAttribute('tabindex', '-1');
        mainEl.focus();
        mainEl.removeAttribute('tabindex');
      }
    }
  }, [location.pathname, getTitle, announce, focusMainOnChange, mainContentId]);
}
