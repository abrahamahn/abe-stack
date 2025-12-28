import { useEffect, useState } from 'react';

export type Route =
  | { type: 'root'; url: string }
  | { type: 'home'; url: string }
  | { type: 'media'; url: string }
  | { type: 'social'; url: string }
  | { type: 'settings'; url: string }
  | { type: 'dashboard'; url: string }
  | { type: 'profile'; url: string }
  | { type: 'upload'; url: string }
  | { type: 'explore'; url: string }
  | { type: 'notifications'; url: string }
  | { type: 'design'; url: string; page: string }
  | { type: 'auth'; url: string; action: string; token?: string }
  | { type: 'unknown'; url: string };

// Define interface for window with router
interface WindowWithRouter extends Window {
  router?: Router;
}

export class Router {
  private listeners: Set<() => void> = new Set();
  private currentRoute: Route;

  constructor() {
    this.currentRoute = this.parseUrl(window.location.pathname + window.location.search);

    // Listen for popstate events (back/forward buttons)
    window.addEventListener('popstate', () => {
      this.currentRoute = this.parseUrl(window.location.pathname + window.location.search);
      this.notifyListeners();
    });
  }

  private parseUrl(url: string): Route {
    // Extract path and search params
    const [path, search] = url.split('?');
    const searchParams = new URLSearchParams(search ? `?${search}` : '');

    if (path === '/' || path === '') {
      return { type: 'root', url: path };
    }

    if (path === '/home') {
      return { type: 'home', url: path };
    }

    if (path === '/media') {
      return { type: 'media', url: path };
    }

    if (path === '/social') {
      return { type: 'social', url: path };
    }

    if (path === '/settings') {
      return { type: 'settings', url: path };
    }

    if (path === '/dashboard') {
      return { type: 'dashboard', url: path };
    }

    if (path === '/profile') {
      return { type: 'profile', url: path };
    }

    if (path === '/upload') {
      return { type: 'upload', url: path };
    }

    if (path === '/explore') {
      return { type: 'explore', url: path };
    }

    if (path === '/notifications') {
      return { type: 'notifications', url: path };
    }

    if (path.startsWith('/design/')) {
      const page = path.slice('/design/'.length);
      return { type: 'design', url: path, page };
    }

    // Auth routes
    if (path.startsWith('/auth/')) {
      const action = path.slice('/auth/'.length);
      const token = searchParams.get('token') || undefined;
      return { type: 'auth', url: path, action, token };
    }

    return { type: 'unknown', url: path };
  }

  private notifyListeners() {
    this.listeners.forEach((listener) => listener());
  }

  public getCurrentRoute(): Route {
    return this.currentRoute;
  }

  public navigate(url: string) {
    window.history.pushState(null, '', url);
    this.currentRoute = this.parseUrl(url);
    this.notifyListeners();
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }
}

export function useRouter(): { route: Route; navigate: (url: string) => void } {
  const [route, setRoute] = useState<Route>(() => {
    // Access the router from the window object during development
    const router = (window as WindowWithRouter).router;
    return router ? router.getCurrentRoute() : { type: 'unknown', url: window.location.pathname };
  });

  useEffect(() => {
    const router = (window as WindowWithRouter).router;
    if (!router) {
      console.error('Router not found on window object');
      return;
    }

    const unsubscribe = router.subscribe(() => {
      setRoute(router.getCurrentRoute());
    });

    return unsubscribe;
  }, []);

  const navigate = (url: string) => {
    const router = (window as WindowWithRouter).router;
    if (!router) {
      console.error('Router not found on window object');
      return;
    }
    router.navigate(url);
  };

  return { route, navigate };
}

export function useRoute(): Route {
  const { route } = useRouter();
  return route;
}
