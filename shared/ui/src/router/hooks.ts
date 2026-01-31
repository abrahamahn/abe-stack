// shared/ui/src/router/hooks.ts
/**
 * Custom Router Hooks
 *
 */

import { useCallback, useMemo } from 'react';

import { useRouterContext } from './context';

import type { NavigateFunction, RouterLocation } from './context';

// ============================================================================
// useNavigate
// ============================================================================

/**
 * Returns a function to navigate programmatically.
 *
 * @example
 * const navigate = useNavigate();
 * navigate('/dashboard');
 * navigate(-1); // Go back
 * navigate('/login', { replace: true });
 */
export function useNavigate(): NavigateFunction {
  const { navigate } = useRouterContext();
  return navigate;
}

// ============================================================================
// useLocation
// ============================================================================

/**
 * Returns the current location object.
 *
 * @example
 * const location = useLocation();
 * console.log(location.pathname); // '/dashboard'
 * console.log(location.search);   // '?tab=settings'
 */
export function useLocation(): RouterLocation {
  const { location } = useRouterContext();
  return location;
}

// ============================================================================
// useSearchParams
// ============================================================================

type SetSearchParams = (
  params: URLSearchParams | Record<string, string> | ((prev: URLSearchParams) => URLSearchParams),
  options?: { replace?: boolean },
) => void;

/**
 * Returns the current search params and a function to update them.
 *
 * @example
 * const [searchParams, setSearchParams] = useSearchParams();
 * const tab = searchParams.get('tab');
 * setSearchParams({ tab: 'settings' });
 */
export function useSearchParams(): [URLSearchParams, SetSearchParams] {
  const { location, navigate } = useRouterContext();

  const searchParams = useMemo(() => new URLSearchParams(location.search), [location.search]);

  const setSearchParams: SetSearchParams = useCallback(
    (params, options = {}) => {
      let nextParams: URLSearchParams;

      if (typeof params === 'function') {
        nextParams = params(new URLSearchParams(location.search));
      } else if (params instanceof URLSearchParams) {
        nextParams = params;
      } else {
        nextParams = new URLSearchParams(params);
      }

      const search = nextParams.toString();
      const url = `${location.pathname}${search !== '' ? `?${search}` : ''}${location.hash}`;

      navigate(url, {
        ...(options.replace !== undefined && { replace: options.replace }),
      });
    },
    [location.pathname, location.search, location.hash, navigate],
  );

  return [searchParams, setSearchParams];
}

// ============================================================================
// useParams (for route parameters)
// ============================================================================

// Route params are passed via RouteContext, not RouterContext
// This will be implemented in components.tsx with Routes/Route
