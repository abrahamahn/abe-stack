// src/client/react/src/router/components.tsx
/**
 * Custom Router Components
 *
 */

import react, { createContext, useContext, useEffect, useMemo } from 'react';

import { useRouterContext } from './context';

import type { ReactElement, ReactNode } from 'react';

// ============================================================================
// Route Params Context
// ============================================================================

const RouteParamsContext = createContext<Record<string, string>>({});

export const useParams = (): Record<string, string> => {
  return useContext(RouteParamsContext);
};

// ============================================================================
// Route Matching
// ============================================================================

interface RouteMatch {
  params: Record<string, string>;
  path: string;
  /** Remaining path after parent match (for nested routes) */
  remainingPath?: string;
}

/**
 * Match a path pattern against a pathname.
 * @param pattern - Route pattern (e.g., '/users/:id', '/app/*')
 * @param pathname - Current URL pathname
 * @param options - Match options
 */
function matchPath(
  pattern: string | undefined,
  pathname: string,
  options?: { index?: boolean; parentPath?: string; hasChildren?: boolean },
): RouteMatch | null {
  const { index, parentPath = '', hasChildren = false } = options ?? {};

  // Calculate the relative path for nested routes
  const relativePath =
    parentPath !== ''
      ? pathname.slice(parentPath.length) !== ''
        ? pathname.slice(parentPath.length)
        : '/'
      : pathname;

  // Handle index route - matches when relativePath is '/' or empty
  if (index === true) {
    if (relativePath === '/' || relativePath === '') {
      return { params: {}, path: parentPath !== '' ? parentPath : '/' };
    }
    return null;
  }

  // If no pattern provided, no match
  if ((pattern ?? '') === '') return null;

  // Handle catch-all route
  if (pattern === '*') {
    return { params: { ['*']: pathname }, path: pathname };
  }

  // Normalize pattern - handle parent path and avoid double slashes
  let fullPattern: string;
  if (parentPath !== '') {
    // If parent is root "/" and pattern doesn't start with "/", just prepend "/"
    if (parentPath === '/' && !(pattern ?? '').startsWith('/')) {
      fullPattern = `/${pattern ?? ''}`;
    } else if ((pattern ?? '').startsWith('/')) {
      fullPattern = `${parentPath}${pattern ?? ''}`;
    } else {
      fullPattern = `${parentPath}/${pattern ?? ''}`;
    }
  } else {
    fullPattern = pattern ?? '';
  }

  // Convert route pattern to regex
  // /users/:id -> /users/([^/]+)
  // /users/:id? -> /users(?:/([^/]*))?
  // /files/* -> /files/(.*)
  const paramNames: string[] = [];
  const regexPattern = fullPattern
    .replace(/\/:([^/]+)/g, (_, rawName: string) => {
      const isOptional = rawName.endsWith('?');
      const name = isOptional ? rawName.slice(0, -1) : rawName;
      paramNames.push(name);
      return isOptional ? '(?:/([^/]*))?' : '/([^/]+)';
    })
    .replace(/\/\*$/, '(?:/(.*))?');

  // Build the matching regex
  // For parent routes (routes with children), allow partial matches
  // For leaf routes, require exact matches
  const exactRegex = new RegExp(`^${regexPattern}$`);
  let matchRegex: RegExp;

  if (hasChildren) {
    // Layout routes can match partial paths
    if (regexPattern === '/') {
      matchRegex = new RegExp(`^/.*$`);
    } else {
      matchRegex = new RegExp(`^${regexPattern}(?:/.*)?$`);
    }
  } else {
    // Leaf routes require exact matches
    matchRegex = exactRegex;
  }

  const match = pathname.match(matchRegex);

  if (match === null) return null;

  const params: Record<string, string> = {};
  paramNames.forEach((name, i) => {
    params[name] = match[i + 1] ?? '';
  });

  // Handle wildcard
  if (pattern?.endsWith('/*') === true) {
    params['*'] = match[match.length - 1] ?? '';
  }

  // Calculate remaining path for nested routes
  const exactMatch = pathname.match(exactRegex);
  const matchedPath = exactMatch !== null ? pathname : fullPattern;
  const remainingPath = exactMatch !== null ? '' : pathname.slice(fullPattern.length);

  return { params, path: matchedPath, remainingPath };
}

// ============================================================================
// Route Component
// ============================================================================

export interface RouteProps {
  path?: string;
  element?: ReactElement;
  children?: ReactNode;
  index?: boolean;
}

export const Route = (_props: RouteProps): ReactElement | null => {
  // Route is just a configuration component, rendering is handled by Routes
  return null;
};

// ============================================================================
// Routes Component
// ============================================================================

export interface RoutesProps {
  children: ReactNode;
  /** Internal: Parent path for nested routes */
  _parentPath?: string;
}

interface RouteConfig extends RouteProps {
  childRoutes?: RouteConfig[];
}

function extractRoutes(children: ReactNode): RouteConfig[] {
  const result: RouteConfig[] = [];

  react.Children.forEach(children, (child) => {
    if (react.isValidElement(child) && child.type === Route) {
      const props = child.props as RouteProps;
      const childRoutes = props.children != null ? extractRoutes(props.children) : undefined;
      result.push({
        ...props,
        ...(childRoutes !== undefined && { childRoutes }),
      });
    }
  });

  return result;
}

export const Routes = ({ children, _parentPath = '' }: RoutesProps): ReactElement | null => {
  const { location } = useRouterContext();

  // Extract route configurations from children
  const routes = useMemo(() => extractRoutes(children), [children]);

  // Find matching route
  const match = useMemo(() => {
    for (const route of routes) {
      const routeMatch = matchPath(route.path, location.pathname, {
        ...(route.index !== undefined && { index: route.index }),
        parentPath: _parentPath,
        hasChildren: (route.childRoutes?.length ?? 0) > 0,
      });
      if (routeMatch !== null) {
        return { route, match: routeMatch };
      }
    }
    return null;
  }, [routes, location.pathname, _parentPath]);

  if (match === null) return null;

  // If the route has child routes, render nested Routes as outlet
  let outlet: ReactElement | null = null;
  if (match.route.childRoutes != null && match.route.childRoutes.length > 0) {
    const childRouteElements = match.route.childRoutes.map((childRoute, i) => (
      <Route key={i} {...childRoute} />
    ));
    outlet = <Routes _parentPath={match.match.path}>{childRouteElements}</Routes>;
  }

  const element = match.route.element ?? null;

  return (
    <RouteParamsContext.Provider value={match.match.params}>
      <OutletProvider outlet={outlet}>{element}</OutletProvider>
    </RouteParamsContext.Provider>
  );
};

// ============================================================================
// Link Component
// ============================================================================

export interface LinkProps extends Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> {
  to: string;
  replace?: boolean;
  state?: unknown;
  children: ReactNode;
}

export const Link = ({
  to,
  replace = false,
  state,
  children,
  onClick,
  ...props
}: LinkProps): ReactElement => {
  const { navigate } = useRouterContext();

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>): void => {
    // Allow default behavior for modified clicks
    if (e.metaKey || e.altKey || e.ctrlKey || e.shiftKey || e.button !== 0) {
      return;
    }

    e.preventDefault();
    onClick?.(e);
    navigate(to, { replace, state });
  };

  return (
    <a href={to} onClick={handleClick} {...props}>
      {children}
    </a>
  );
};

// ============================================================================
// Navigate Component (for redirects)
// ============================================================================

export interface NavigateProps {
  to: string;
  replace?: boolean;
  state?: unknown;
}

export const Navigate = ({ to, replace = false, state }: NavigateProps): null => {
  const { navigate } = useRouterContext();

  useEffect(() => {
    navigate(to, { replace, state });
  }, [navigate, to, replace, state]);

  return null;
};

// ============================================================================
// Outlet Component (for nested routes)
// ============================================================================

const OutletContext = createContext<ReactElement | null>(null);

export const Outlet = (): ReactElement | null => {
  return useContext(OutletContext);
};

export interface OutletProviderProps {
  children: ReactNode;
  outlet: ReactElement | null;
}

export const OutletProvider = ({ children, outlet }: OutletProviderProps): ReactElement => {
  return <OutletContext.Provider value={outlet}>{children}</OutletContext.Provider>;
};
