// packages/sdk/src/hooks/__tests__/useAuthModeNavigation.test.ts
/**
 * @vitest-environment jsdom
 */
import { renderHook, act } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';

import { useAuthModeNavigation } from '../useAuthModeNavigation';

import type { AuthMode } from '../useAuthModeNavigation';

// Mock react-router-dom
const mockNavigate = vi.fn();
vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}));

describe('useAuthModeNavigation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should navigate to login route', () => {
    const { result } = renderHook(() => useAuthModeNavigation());

    act(() => {
      result.current.navigateToLogin();
    });

    expect(mockNavigate).toHaveBeenCalledWith('/login', { replace: false });
  });

  it('should navigate to register route', () => {
    const { result } = renderHook(() => useAuthModeNavigation());

    act(() => {
      result.current.navigateToRegister();
    });

    expect(mockNavigate).toHaveBeenCalledWith('/register', { replace: false });
  });

  it('should navigate to forgot-password route', () => {
    const { result } = renderHook(() => useAuthModeNavigation());

    act(() => {
      result.current.navigateToForgotPassword();
    });

    expect(mockNavigate).toHaveBeenCalledWith('/auth?mode=forgot-password', { replace: false });
  });

  it('should navigate to any auth mode', () => {
    const { result } = renderHook(() => useAuthModeNavigation());

    const modes: AuthMode[] = ['login', 'register', 'forgot-password', 'reset-password'];
    const expectedRoutes: Record<AuthMode, string> = {
      login: '/login',
      register: '/register',
      'forgot-password': '/auth?mode=forgot-password',
      'reset-password': '/auth?mode=reset-password',
    };

    for (const mode of modes) {
      act(() => {
        result.current.navigateToMode(mode);
      });

      expect(mockNavigate).toHaveBeenLastCalledWith(expectedRoutes[mode], { replace: false });
    }
  });

  it('should use replace navigation when specified', () => {
    const { result } = renderHook(() => useAuthModeNavigation({ replace: true }));

    act(() => {
      result.current.navigateToLogin();
    });

    expect(mockNavigate).toHaveBeenCalledWith('/login', { replace: true });
  });

  it('should call onBeforeNavigate callback', () => {
    const onBeforeNavigate = vi.fn();
    const { result } = renderHook(() => useAuthModeNavigation({ onBeforeNavigate }));

    act(() => {
      result.current.navigateToMode('register');
    });

    expect(onBeforeNavigate).toHaveBeenCalledWith('register');
    expect(onBeforeNavigate).toHaveBeenCalledBefore(mockNavigate);
  });

  it('should use custom route map when provided', () => {
    const { result } = renderHook(() =>
      useAuthModeNavigation({
        routeMap: {
          login: '/custom/login',
          register: '/custom/register',
        },
      }),
    );

    act(() => {
      result.current.navigateToLogin();
    });

    expect(mockNavigate).toHaveBeenCalledWith('/custom/login', { replace: false });

    act(() => {
      result.current.navigateToRegister();
    });

    expect(mockNavigate).toHaveBeenCalledWith('/custom/register', { replace: false });

    // Non-overridden routes should use defaults
    act(() => {
      result.current.navigateToForgotPassword();
    });

    expect(mockNavigate).toHaveBeenCalledWith('/auth?mode=forgot-password', { replace: false });
  });
});
