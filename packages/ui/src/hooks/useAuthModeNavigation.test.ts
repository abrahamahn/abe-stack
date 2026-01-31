// packages/ui/src/hooks/useAuthModeNavigation.test.ts
/**
 * Tests for useAuthModeNavigation hook.
 *
 * Tests hook for centralized auth-related navigation patterns.
 */
import { renderHook, waitFor } from '@testing-library/react';
import React, { type ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { MemoryRouter, useLocation } from '../router';
import { useAuthModeNavigation } from './useAuthModeNavigation';

function createWrapper(initialPath = '/') {
  return function wrapper({ children }: { children: ReactNode }): React.JSX.Element {
    return React.createElement(MemoryRouter, { initialEntries: [initialPath] }, children);
  };
}
describe('useAuthModeNavigation', () => {
  describe('navigateToMode', () => {
    it('should navigate to login page', async () => {
      const { result } = renderHook(
        () => {
          const nav = useAuthModeNavigation();
          const location = useLocation();
          return { nav, location };
        },
        { wrapper: createWrapper('/') },
      );
      result.current.nav.navigateToMode('login');
      await waitFor(() => {
        expect(result.current.location.pathname).toBe('/login');
      });
    });
    it('should navigate to register page', async () => {
      const { result } = renderHook(
        () => {
          const nav = useAuthModeNavigation();
          const location = useLocation();
          return { nav, location };
        },
        { wrapper: createWrapper('/') },
      );
      result.current.nav.navigateToMode('register');
      await waitFor(() => {
        expect(result.current.location.pathname).toBe('/register');
      });
    });
    it('should navigate to forgot password page', async () => {
      const { result } = renderHook(
        () => {
          const nav = useAuthModeNavigation();
          const location = useLocation();
          return { nav, location };
        },
        { wrapper: createWrapper('/') },
      );
      result.current.nav.navigateToMode('forgot-password');
      await waitFor(() => {
        expect(result.current.location.pathname).toBe('/auth');
        expect(result.current.location.search).toContain('mode=forgot-password');
      });
    });
    it('should navigate to reset password page', async () => {
      const { result } = renderHook(
        () => {
          const nav = useAuthModeNavigation();
          const location = useLocation();
          return { nav, location };
        },
        { wrapper: createWrapper('/') },
      );
      result.current.nav.navigateToMode('reset-password');
      await waitFor(() => {
        expect(result.current.location.pathname).toBe('/auth');
        expect(result.current.location.search).toContain('mode=reset-password');
      });
    });
  });
  describe('navigateToLogin', () => {
    it('should navigate to login page', async () => {
      const { result } = renderHook(
        () => {
          const nav = useAuthModeNavigation();
          const location = useLocation();
          return { nav, location };
        },
        { wrapper: createWrapper('/') },
      );
      result.current.nav.navigateToLogin();
      await waitFor(() => {
        expect(result.current.location.pathname).toBe('/login');
      });
    });
    it('should use default login route', async () => {
      const { result } = renderHook(
        () => {
          const nav = useAuthModeNavigation();
          const location = useLocation();
          return { nav, location };
        },
        { wrapper: createWrapper('/dashboard') },
      );
      result.current.nav.navigateToLogin();
      await waitFor(() => {
        expect(result.current.location.pathname).toBe('/login');
      });
    });
  });
  describe('navigateToRegister', () => {
    it('should navigate to register page', async () => {
      const { result } = renderHook(
        () => {
          const nav = useAuthModeNavigation();
          const location = useLocation();
          return { nav, location };
        },
        { wrapper: createWrapper('/') },
      );
      result.current.nav.navigateToRegister();
      await waitFor(() => {
        expect(result.current.location.pathname).toBe('/register');
      });
    });
    it('should use default register route', async () => {
      const { result } = renderHook(
        () => {
          const nav = useAuthModeNavigation();
          const location = useLocation();
          return { nav, location };
        },
        { wrapper: createWrapper('/login') },
      );
      result.current.nav.navigateToRegister();
      await waitFor(() => {
        expect(result.current.location.pathname).toBe('/register');
      });
    });
  });
  describe('navigateToForgotPassword', () => {
    it('should navigate to forgot password page', async () => {
      const { result } = renderHook(
        () => {
          const nav = useAuthModeNavigation();
          const location = useLocation();
          return { nav, location };
        },
        { wrapper: createWrapper('/') },
      );
      result.current.nav.navigateToForgotPassword();
      await waitFor(() => {
        expect(result.current.location.pathname).toBe('/auth');
        expect(result.current.location.search).toContain('mode=forgot-password');
      });
    });
    it('should use default forgot password route', async () => {
      const { result } = renderHook(
        () => {
          const nav = useAuthModeNavigation();
          const location = useLocation();
          return { nav, location };
        },
        { wrapper: createWrapper('/login') },
      );
      result.current.nav.navigateToForgotPassword();
      await waitFor(() => {
        expect(result.current.location.pathname).toBe('/auth');
        expect(result.current.location.search).toContain('mode=forgot-password');
      });
    });
  });
  describe('onBeforeNavigate callback', () => {
    it('should call onBeforeNavigate before navigation', async () => {
      const onBeforeNavigate = vi.fn();
      const { result } = renderHook(() => useAuthModeNavigation({ onBeforeNavigate }), {
        wrapper: createWrapper('/'),
      });
      result.current.navigateToMode('login');
      await waitFor(() => {
        expect(onBeforeNavigate).toHaveBeenCalledTimes(1);
        expect(onBeforeNavigate).toHaveBeenCalledWith('login');
      });
    });
    it('should call onBeforeNavigate for each navigation', async () => {
      const onBeforeNavigate = vi.fn();
      const { result } = renderHook(() => useAuthModeNavigation({ onBeforeNavigate }), {
        wrapper: createWrapper('/'),
      });
      result.current.navigateToLogin();
      result.current.navigateToRegister();
      result.current.navigateToForgotPassword();
      await waitFor(() => {
        expect(onBeforeNavigate).toHaveBeenCalledTimes(3);
        expect(onBeforeNavigate).toHaveBeenNthCalledWith(1, 'login');
        expect(onBeforeNavigate).toHaveBeenNthCalledWith(2, 'register');
        expect(onBeforeNavigate).toHaveBeenNthCalledWith(3, 'forgot-password');
      });
    });
    it('should not throw if onBeforeNavigate is undefined', () => {
      const { result } = renderHook(() => useAuthModeNavigation(), {
        wrapper: createWrapper('/'),
      });
      expect(() => {
        result.current.navigateToLogin();
      }).not.toThrow();
    });
  });
  describe('replace option', () => {
    it('should use push navigation by default', async () => {
      const { result } = renderHook(
        () => {
          const nav = useAuthModeNavigation();
          const location = useLocation();
          return { nav, location };
        },
        { wrapper: createWrapper('/') },
      );
      result.current.nav.navigateToLogin();
      await waitFor(() => {
        expect(result.current.location.pathname).toBe('/login');
      });
    });
    it('should use replace navigation when replace is true', async () => {
      const { result } = renderHook(
        () => {
          const nav = useAuthModeNavigation({ replace: true });
          const location = useLocation();
          return { nav, location };
        },
        { wrapper: createWrapper('/dashboard') },
      );
      const initialPath = result.current.location.pathname;
      result.current.nav.navigateToLogin();
      await waitFor(() => {
        expect(result.current.location.pathname).toBe('/login');
        expect(result.current.location.pathname).not.toBe(initialPath);
      });
    });
  });
  describe('custom route mapping', () => {
    it('should use custom login route', async () => {
      const { result } = renderHook(
        () => {
          const nav = useAuthModeNavigation({
            routeMap: { login: '/auth/login' },
          });
          const location = useLocation();
          return { nav, location };
        },
        { wrapper: createWrapper('/') },
      );
      result.current.nav.navigateToLogin();
      await waitFor(() => {
        expect(result.current.location.pathname).toBe('/auth/login');
      });
    });
    it('should use custom register route', async () => {
      const { result } = renderHook(
        () => {
          const nav = useAuthModeNavigation({
            routeMap: { register: '/auth/register' },
          });
          const location = useLocation();
          return { nav, location };
        },
        { wrapper: createWrapper('/') },
      );
      result.current.nav.navigateToRegister();
      await waitFor(() => {
        expect(result.current.location.pathname).toBe('/auth/register');
      });
    });
    it('should use custom forgot password route', async () => {
      const { result } = renderHook(
        () => {
          const nav = useAuthModeNavigation({
            routeMap: { 'forgot-password': '/password/forgot' },
          });
          const location = useLocation();
          return { nav, location };
        },
        { wrapper: createWrapper('/') },
      );
      result.current.nav.navigateToForgotPassword();
      await waitFor(() => {
        expect(result.current.location.pathname).toBe('/password/forgot');
      });
    });
    it('should merge custom routes with defaults', async () => {
      const { result } = renderHook(
        () => {
          const nav = useAuthModeNavigation({
            routeMap: { login: '/auth/login' },
          });
          const location = useLocation();
          return { nav, location };
        },
        { wrapper: createWrapper('/') },
      );
      // Custom route
      result.current.nav.navigateToLogin();
      await waitFor(() => {
        expect(result.current.location.pathname).toBe('/auth/login');
      });
      // Default route
      result.current.nav.navigateToRegister();
      await waitFor(() => {
        expect(result.current.location.pathname).toBe('/register');
      });
    });
    it('should handle partial route map', async () => {
      const { result } = renderHook(
        () => {
          const nav = useAuthModeNavigation({
            routeMap: { login: '/custom/login' },
          });
          const location = useLocation();
          return { nav, location };
        },
        { wrapper: createWrapper('/') },
      );
      result.current.nav.navigateToLogin();
      await waitFor(() => {
        expect(result.current.location.pathname).toBe('/custom/login');
      });
      result.current.nav.navigateToRegister();
      await waitFor(() => {
        expect(result.current.location.pathname).toBe('/register');
      });
      result.current.nav.navigateToForgotPassword();
      await waitFor(() => {
        expect(result.current.location.pathname).toBe('/auth');
      });
    });
  });
  describe('function stability', () => {
    it('should maintain function references across renders', () => {
      const { result, rerender } = renderHook(() => useAuthModeNavigation(), {
        wrapper: createWrapper('/'),
      });
      const firstNavigateToMode = result.current.navigateToMode;
      const firstNavigateToLogin = result.current.navigateToLogin;
      const firstNavigateToRegister = result.current.navigateToRegister;
      const firstNavigateToForgotPassword = result.current.navigateToForgotPassword;
      rerender();
      expect(result.current.navigateToMode).toBe(firstNavigateToMode);
      expect(result.current.navigateToLogin).toBe(firstNavigateToLogin);
      expect(result.current.navigateToRegister).toBe(firstNavigateToRegister);
      expect(result.current.navigateToForgotPassword).toBe(firstNavigateToForgotPassword);
    });
    it('should update when options change', () => {
      const { result, rerender } = renderHook(({ options }) => useAuthModeNavigation(options), {
        wrapper: createWrapper('/'),
        initialProps: { options: { replace: false } },
      });
      const firstNavigateToMode = result.current.navigateToMode;
      rerender({ options: { replace: true } });
      // Function should update when options change
      expect(result.current.navigateToMode).not.toBe(firstNavigateToMode);
    });
  });
  describe('edge cases', () => {
    it('should handle navigation from different starting paths', async () => {
      const paths = ['/dashboard', '/profile', '/settings', '/'];
      for (const path of paths) {
        const { result } = renderHook(
          () => {
            const nav = useAuthModeNavigation();
            const location = useLocation();
            return { nav, location };
          },
          { wrapper: createWrapper(path) },
        );
        result.current.nav.navigateToLogin();
        await waitFor(() => {
          expect(result.current.location.pathname).toBe('/login');
        });
      }
    });
    it('should handle rapid sequential navigations', async () => {
      const { result } = renderHook(
        () => {
          const nav = useAuthModeNavigation();
          const location = useLocation();
          return { nav, location };
        },
        { wrapper: createWrapper('/') },
      );
      result.current.nav.navigateToLogin();
      result.current.nav.navigateToRegister();
      result.current.nav.navigateToForgotPassword();
      await waitFor(() => {
        expect(result.current.location.pathname).toBe('/auth');
        expect(result.current.location.search).toContain('mode=forgot-password');
      });
    });
    it('should handle navigation with empty route map', async () => {
      const { result } = renderHook(
        () => {
          const nav = useAuthModeNavigation({ routeMap: {} });
          const location = useLocation();
          return { nav, location };
        },
        { wrapper: createWrapper('/') },
      );
      result.current.nav.navigateToLogin();
      await waitFor(() => {
        expect(result.current.location.pathname).toBe('/login');
      });
    });
    it('should handle undefined options', () => {
      const { result } = renderHook(() => useAuthModeNavigation(undefined), {
        wrapper: createWrapper('/'),
      });
      expect(() => {
        result.current.navigateToLogin();
      }).not.toThrow();
    });
    it('should handle routes with query params', async () => {
      const { result } = renderHook(
        () => {
          const nav = useAuthModeNavigation({
            routeMap: { login: '/auth/login?redirect=/dashboard' },
          });
          const location = useLocation();
          return { nav, location };
        },
        { wrapper: createWrapper('/') },
      );
      result.current.nav.navigateToLogin();
      await waitFor(() => {
        expect(result.current.location.pathname).toBe('/auth/login');
        expect(result.current.location.search).toContain('redirect=/dashboard');
      });
    });
    it('should handle routes with hash', async () => {
      const { result } = renderHook(
        () => {
          const nav = useAuthModeNavigation({
            routeMap: { login: '/login#form' },
          });
          const location = useLocation();
          return { nav, location };
        },
        { wrapper: createWrapper('/') },
      );
      result.current.nav.navigateToLogin();
      await waitFor(() => {
        expect(result.current.location.pathname).toBe('/login');
        expect(result.current.location.hash).toBe('#form');
      });
    });
  });
  describe('integration with onBeforeNavigate and replace', () => {
    it('should call onBeforeNavigate before replace navigation', async () => {
      const onBeforeNavigate = vi.fn();
      const { result } = renderHook(
        () => useAuthModeNavigation({ onBeforeNavigate, replace: true }),
        {
          wrapper: createWrapper('/'),
        },
      );
      result.current.navigateToLogin();
      await waitFor(() => {
        expect(onBeforeNavigate).toHaveBeenCalledTimes(1);
        expect(onBeforeNavigate).toHaveBeenCalledWith('login');
      });
    });
    it('should work with custom routes and callbacks', async () => {
      const onBeforeNavigate = vi.fn();
      const { result } = renderHook(
        () => {
          const nav = useAuthModeNavigation({
            onBeforeNavigate,
            routeMap: { login: '/auth/login' },
          });
          const location = useLocation();
          return { nav, location };
        },
        { wrapper: createWrapper('/') },
      );
      result.current.nav.navigateToLogin();
      await waitFor(() => {
        expect(onBeforeNavigate).toHaveBeenCalledWith('login');
        expect(result.current.location.pathname).toBe('/auth/login');
      });
    });
  });
});
