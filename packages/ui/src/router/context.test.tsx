// packages/ui/src/router/context.test.tsx
/** @vitest-environment jsdom */
/**
 * Unit tests for custom router context implementation.
 *
 * Tests cover:
 * - Browser history abstraction (push, replace, go, scroll restoration)
 * - Router provider with useSyncExternalStore integration
 * - MemoryRouter for testing scenarios
 * - Router hooks (useRouterContext, useNavigationType, useHistory)
 * - Navigation type tracking (PUSH, POP, REPLACE)
 * - Scroll position management
 *
 * @complexity O(1) per test - simple assertions and state checks
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

import {
  Router,
  MemoryRouter,
  useRouterContext,
  useNavigationType,
  useHistory,
  RouterContext,
} from './context';

import type { NavigateFunction, RouterLocation, NavigationType } from './context';
import type { ReactElement } from 'react';

// ============================================================================
// Test Harness Components
// ============================================================================

/**
 * Harness to test Router hooks and navigation
 */
// eslint-disable-next-line @typescript-eslint/naming-convention
function RouterHarness(): ReactElement {
  const { location, navigationType, navigate } = useRouterContext();

  return (
    <div>
      <div data-testid="pathname">{location.pathname}</div>
      <div data-testid="search">{location.search}</div>
      <div data-testid="hash">{location.hash}</div>
      <div data-testid="state">
        {location.state !== null ? JSON.stringify(location.state) : 'null'}
      </div>
      <div data-testid="key">{location.key}</div>
      <div data-testid="navType">{navigationType}</div>

      <button onClick={() => { navigate('/about'); }}>Navigate to About</button>
      <button onClick={() => { navigate('/contact', { state: { from: 'home' } }); }}>
        Navigate with State
      </button>
      <button onClick={() => { navigate('/profile', { replace: true }); }}>Navigate Replace</button>
      <button onClick={() => { navigate(-1); }}>Go Back</button>
      <button onClick={() => { navigate(1); }}>Go Forward</button>
      <button onClick={() => { navigate('/scroll', { preventScrollReset: true }); }}>
        Navigate No Scroll
      </button>
    </div>
  );
}

/**
 * Harness to test useNavigationType hook
 */
// eslint-disable-next-line @typescript-eslint/naming-convention
function NavigationTypeHarness(): ReactElement {
  const navType = useNavigationType();
  return <div data-testid="navType">{navType}</div>;
}

/**
 * Harness to test useHistory hook
 */
// eslint-disable-next-line @typescript-eslint/naming-convention
function HistoryHarness(): ReactElement {
  const history = useHistory();
  return (
    <div>
      <div data-testid="hasHistory">{history !== null ? 'true' : 'false'}</div>
      <button
        onClick={() => {
          if (history !== null) history.push('/test');
        }}
      >
        History Push
      </button>
      <button
        onClick={() => {
          if (history !== null) history.back();
        }}
      >
        History Back
      </button>
    </div>
  );
}

/**
 * Minimal consumer to test MemoryRouter
 */
// eslint-disable-next-line @typescript-eslint/naming-convention
function MemoryRouterHarness(): ReactElement {
  const { location, navigate } = useRouterContext();
  return (
    <div>
      <div data-testid="pathname">{location.pathname}</div>
      <div data-testid="search">{location.search}</div>
      <div data-testid="hash">{location.hash}</div>
      <div data-testid="state">
        {location.state !== null ? JSON.stringify(location.state) : 'null'}
      </div>
      <button onClick={() => { navigate('/test'); }}>Navigate</button>
      <button onClick={() => { navigate('/replace', { replace: true }); }}>Replace</button>
      <button onClick={() => { navigate(-1); }}>Back</button>
      <button onClick={() => { navigate(1); }}>Forward</button>
    </div>
  );
}

// ============================================================================
// Browser Router Tests
// ============================================================================

describe('Router (BrowserRouter)', () => {
  beforeEach(() => {
    // Reset browser history to clean state
    window.history.replaceState(null, '', '/');
    window.scrollTo(0, 0);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('basic rendering', () => {
    it('should render children', () => {
      render(
        <Router>
          <div data-testid="child">Content</div>
        </Router>,
      );

      expect(screen.getByTestId('child')).toBeInTheDocument();
      expect(screen.getByText('Content')).toBeInTheDocument();
    });

    it('should provide router context to children', () => {
      render(
        <Router>
          <RouterHarness />
        </Router>,
      );

      expect(screen.getByTestId('pathname')).toBeInTheDocument();
      expect(screen.getByTestId('navType')).toBeInTheDocument();
    });

    it('should initialize with default location', () => {
      // The Router initializes with whatever the browser location is at the time
      // Since beforeEach resets to '/', that's what we expect
      render(
        <Router>
          <RouterHarness />
        </Router>,
      );

      // Should reflect the current browser location (which is '/' from beforeEach)
      expect(screen.getByTestId('pathname')).toHaveTextContent('/');
      expect(screen.getByTestId('search')).toHaveTextContent('');
      expect(screen.getByTestId('hash')).toHaveTextContent('');
    });

    it('should initialize with POP navigation type', () => {
      render(
        <Router>
          <RouterHarness />
        </Router>,
      );

      expect(screen.getByTestId('navType')).toHaveTextContent('POP');
    });
  });

  describe('navigation', () => {
    it('should navigate to new route on push', async () => {
      const user = userEvent.setup();

      render(
        <Router>
          <RouterHarness />
        </Router>,
      );

      expect(screen.getByTestId('pathname')).toHaveTextContent('/');

      await user.click(screen.getByText('Navigate to About'));

      expect(screen.getByTestId('pathname')).toHaveTextContent('/about');
      expect(screen.getByTestId('navType')).toHaveTextContent('PUSH');
    });

    it('should navigate with state', async () => {
      const user = userEvent.setup();

      render(
        <Router>
          <RouterHarness />
        </Router>,
      );

      await user.click(screen.getByText('Navigate with State'));

      expect(screen.getByTestId('pathname')).toHaveTextContent('/contact');
      expect(screen.getByTestId('state')).toHaveTextContent('{"from":"home"}');
    });

    it('should replace current route when replace option is true', async () => {
      const user = userEvent.setup();

      render(
        <Router>
          <RouterHarness />
        </Router>,
      );

      // First navigate to create history
      await user.click(screen.getByText('Navigate to About'));
      expect(screen.getByTestId('pathname')).toHaveTextContent('/about');

      // Then replace
      await user.click(screen.getByText('Navigate Replace'));
      expect(screen.getByTestId('pathname')).toHaveTextContent('/profile');
      expect(screen.getByTestId('navType')).toHaveTextContent('REPLACE');
    });

    it('should handle numeric navigation (go)', async () => {
      const user = userEvent.setup();

      render(
        <Router>
          <RouterHarness />
        </Router>,
      );

      // Navigate forward to build history
      await user.click(screen.getByText('Navigate to About'));
      expect(screen.getByTestId('pathname')).toHaveTextContent('/about');

      await user.click(screen.getByText('Navigate with State'));
      expect(screen.getByTestId('pathname')).toHaveTextContent('/contact');

      // Go back
      await user.click(screen.getByText('Go Back'));

      await waitFor(() => {
        expect(screen.getByTestId('pathname')).toHaveTextContent('/about');
        expect(screen.getByTestId('navType')).toHaveTextContent('POP');
      });
    });

    it('should normalize paths without leading slash', async () => {
      const user = userEvent.setup();

      // eslint-disable-next-line @typescript-eslint/naming-convention
      function NoSlashHarness(): ReactElement {
        const { navigate } = useRouterContext();
        return (
          <button onClick={() => { navigate('test-path'); }}>Navigate No Slash</button>
        );
      }

      render(
        <Router>
          <NoSlashHarness />
        </Router>,
      );

      await user.click(screen.getByText('Navigate No Slash'));

      await waitFor(() => {
        expect(window.location.pathname).toBe('/test-path');
      });
    });
  });

  describe('scroll restoration', () => {
    it('should scroll to top on new navigation by default', async () => {
      const user = userEvent.setup();
      const scrollToSpy = vi.spyOn(window, 'scrollTo').mockImplementation(() => {});

      render(
        <Router>
          <RouterHarness />
        </Router>,
      );

      await user.click(screen.getByText('Navigate to About'));

      await waitFor(() => {
        expect(scrollToSpy).toHaveBeenCalledWith(0, 0);
      });

      scrollToSpy.mockRestore();
    });

    it('should prevent scroll reset when preventScrollReset is true', async () => {
      const user = userEvent.setup();
      const scrollToSpy = vi.spyOn(window, 'scrollTo').mockImplementation(() => {});

      render(
        <Router>
          <RouterHarness />
        </Router>,
      );

      // Clear any initial scroll calls
      scrollToSpy.mockClear();

      await user.click(screen.getByText('Navigate No Scroll'));

      // Wait for navigation to complete
      await waitFor(() => {
        expect(screen.getByTestId('pathname')).toHaveTextContent('/scroll');
      });

      // When preventScrollReset is true, scrollTo should NOT be called
      // However, the implementation still calls it. This test verifies
      // the preventScrollRef mechanism prevents the scroll.
      // Since the mock prevents actual scrolling, we just verify the behavior.
      // Actually, looking at the source code, when preventScrollReset is true,
      // the scroll to top should be prevented. Let's verify scrollTo(0,0) was NOT called.

      // The implementation prevents scrollTo(0,0) when preventScrollRef is true
      // But scrollTo might be called for restoring scroll position on POP
      // For PUSH with preventScrollReset, it should not call scrollTo(0,0)
      const scrollToCalls = scrollToSpy.mock.calls;
      const scrollToTopCalls = scrollToCalls.filter((call) => call[0] === 0 && call[1] === 0);

      expect(scrollToTopCalls.length).toBe(0);

      scrollToSpy.mockRestore();
    });

    it('should disable scroll restoration when scrollRestoration is false', async () => {
      const user = userEvent.setup();
      const scrollToSpy = vi.spyOn(window, 'scrollTo').mockImplementation(() => {});

      render(
        <Router scrollRestoration={false}>
          <RouterHarness />
        </Router>,
      );

      // Clear any scroll calls from initial render
      scrollToSpy.mockClear();

      await user.click(screen.getByText('Navigate to About'));

      // Wait for navigation to complete
      await waitFor(() => {
        expect(screen.getByTestId('pathname')).toHaveTextContent('/about');
      });

      // When scrollRestoration is false, the effect that handles scrolling should not run
      // Verify scrollTo was never called after navigation
      expect(scrollToSpy).not.toHaveBeenCalled();

      scrollToSpy.mockRestore();
    });

    it('should set history.scrollRestoration to manual when enabled', () => {
      if (!('scrollRestoration' in window.history)) {
        // Skip if not supported
        return;
      }

      const originalScrollRestoration = window.history.scrollRestoration;
      window.history.scrollRestoration = 'auto';

      const { unmount } = render(
        <Router scrollRestoration={true}>
          <div>Content</div>
        </Router>,
      );

      expect(window.history.scrollRestoration).toBe('manual');

      unmount();
      expect(window.history.scrollRestoration).toBe(originalScrollRestoration);
    });
  });

  describe('location keys', () => {
    it('should generate unique keys for each navigation', async () => {
      const user = userEvent.setup();

      render(
        <Router>
          <RouterHarness />
        </Router>,
      );

      const initialKey = screen.getByTestId('key').textContent;

      await user.click(screen.getByText('Navigate to About'));

      const secondKey = screen.getByTestId('key').textContent;

      expect(initialKey).not.toBe(secondKey);
      expect(secondKey).toHaveLength(8);
    });

    it('should preserve key on replace navigation', async () => {
      const user = userEvent.setup();

      render(
        <Router>
          <RouterHarness />
        </Router>,
      );

      await user.click(screen.getByText('Navigate to About'));
      const keyBeforeReplace = screen.getByTestId('key').textContent;

      await user.click(screen.getByText('Navigate Replace'));
      const keyAfterReplace = screen.getByTestId('key').textContent;

      // Key should remain the same on replace
      expect(keyBeforeReplace).toBe(keyAfterReplace);
    });
  });

  describe('edge cases', () => {
    it('should handle null children gracefully', () => {
      expect(() => {
        render(<Router>{null}</Router>);
      }).not.toThrow();
    });

    it('should handle multiple children', () => {
      render(
        <Router>
          <div data-testid="child1">First</div>
          <div data-testid="child2">Second</div>
        </Router>,
      );

      expect(screen.getByTestId('child1')).toBeInTheDocument();
      expect(screen.getByTestId('child2')).toBeInTheDocument();
    });

    it('should handle rapid successive navigations', async () => {
      const user = userEvent.setup();

      render(
        <Router>
          <RouterHarness />
        </Router>,
      );

      await user.click(screen.getByText('Navigate to About'));
      await user.click(screen.getByText('Navigate with State'));
      await user.click(screen.getByText('Navigate Replace'));

      expect(screen.getByTestId('pathname')).toHaveTextContent('/profile');
    });
  });
});

// ============================================================================
// MemoryRouter Tests
// ============================================================================

describe('MemoryRouter', () => {
  describe('basic rendering', () => {
    it('should render children', () => {
      render(
        <MemoryRouter>
          <div data-testid="child">Content</div>
        </MemoryRouter>,
      );

      expect(screen.getByTestId('child')).toBeInTheDocument();
    });

    it('should initialize with default route "/"', () => {
      render(
        <MemoryRouter>
          <MemoryRouterHarness />
        </MemoryRouter>,
      );

      expect(screen.getByTestId('pathname')).toHaveTextContent('/');
    });

    it('should initialize with custom initial entries', () => {
      render(
        <MemoryRouter initialEntries={['/home', '/about']}>
          <MemoryRouterHarness />
        </MemoryRouter>,
      );

      // Should start at last entry
      expect(screen.getByTestId('pathname')).toHaveTextContent('/about');
    });

    it('should support initial entries with state', () => {
      render(
        <MemoryRouter
          initialEntries={[{ pathname: '/test', state: { userId: 123 } }]}
          initialIndex={0}
        >
          <MemoryRouterHarness />
        </MemoryRouter>,
      );

      expect(screen.getByTestId('pathname')).toHaveTextContent('/test');
      expect(screen.getByTestId('state')).toHaveTextContent('{"userId":123}');
    });

    it('should respect initialIndex', () => {
      render(
        <MemoryRouter initialEntries={['/home', '/about', '/contact']} initialIndex={1}>
          <MemoryRouterHarness />
        </MemoryRouter>,
      );

      expect(screen.getByTestId('pathname')).toHaveTextContent('/about');
    });
  });

  describe('navigation', () => {
    it('should navigate to new route', async () => {
      const user = userEvent.setup();

      render(
        <MemoryRouter>
          <MemoryRouterHarness />
        </MemoryRouter>,
      );

      expect(screen.getByTestId('pathname')).toHaveTextContent('/');

      await user.click(screen.getByText('Navigate'));

      expect(screen.getByTestId('pathname')).toHaveTextContent('/test');
    });

    it('should replace current entry when replace is true', async () => {
      const user = userEvent.setup();

      render(
        <MemoryRouter initialEntries={['/home', '/about']}>
          <MemoryRouterHarness />
        </MemoryRouter>,
      );

      expect(screen.getByTestId('pathname')).toHaveTextContent('/about');

      await user.click(screen.getByText('Replace'));

      expect(screen.getByTestId('pathname')).toHaveTextContent('/replace');

      // Going back should return to /home, not /about
      await user.click(screen.getByText('Back'));
      expect(screen.getByTestId('pathname')).toHaveTextContent('/home');
    });

    it('should handle numeric navigation (back)', async () => {
      const user = userEvent.setup();

      render(
        <MemoryRouter initialEntries={['/home', '/about', '/contact']}>
          <MemoryRouterHarness />
        </MemoryRouter>,
      );

      expect(screen.getByTestId('pathname')).toHaveTextContent('/contact');

      await user.click(screen.getByText('Back'));
      expect(screen.getByTestId('pathname')).toHaveTextContent('/about');

      await user.click(screen.getByText('Back'));
      expect(screen.getByTestId('pathname')).toHaveTextContent('/home');
    });

    it('should handle numeric navigation (forward)', async () => {
      const user = userEvent.setup();

      render(
        <MemoryRouter initialEntries={['/home', '/about', '/contact']} initialIndex={0}>
          <MemoryRouterHarness />
        </MemoryRouter>,
      );

      expect(screen.getByTestId('pathname')).toHaveTextContent('/home');

      await user.click(screen.getByText('Forward'));
      expect(screen.getByTestId('pathname')).toHaveTextContent('/about');

      await user.click(screen.getByText('Forward'));
      expect(screen.getByTestId('pathname')).toHaveTextContent('/contact');
    });

    it('should clamp index when navigating beyond bounds', async () => {
      const user = userEvent.setup();

      render(
        <MemoryRouter initialEntries={['/home']}>
          <MemoryRouterHarness />
        </MemoryRouter>,
      );

      expect(screen.getByTestId('pathname')).toHaveTextContent('/home');

      // Try to go back when already at first entry
      await user.click(screen.getByText('Back'));
      expect(screen.getByTestId('pathname')).toHaveTextContent('/home');

      // Try to go forward when already at last entry
      await user.click(screen.getByText('Forward'));
      expect(screen.getByTestId('pathname')).toHaveTextContent('/home');
    });
  });

  describe('location parsing', () => {
    it('should parse pathname from full URL', () => {
      render(
        <MemoryRouter initialEntries={['/test']}>
          <MemoryRouterHarness />
        </MemoryRouter>,
      );

      expect(screen.getByTestId('pathname')).toHaveTextContent('/test');
    });

    it('should parse search params from URL', () => {
      render(
        <MemoryRouter initialEntries={['/test?foo=bar&baz=qux']}>
          <MemoryRouterHarness />
        </MemoryRouter>,
      );

      expect(screen.getByTestId('pathname')).toHaveTextContent('/test');
      expect(screen.getByTestId('search')).toHaveTextContent('?foo=bar&baz=qux');
    });

    it('should parse hash from URL', () => {
      render(
        <MemoryRouter initialEntries={['/test#section']}>
          <MemoryRouterHarness />
        </MemoryRouter>,
      );

      expect(screen.getByTestId('pathname')).toHaveTextContent('/test');
      expect(screen.getByTestId('hash')).toHaveTextContent('#section');
    });

    it('should parse complete URL with all parts', () => {
      render(
        <MemoryRouter initialEntries={['/test?query=value#section']}>
          <MemoryRouterHarness />
        </MemoryRouter>,
      );

      expect(screen.getByTestId('pathname')).toHaveTextContent('/test');
      expect(screen.getByTestId('search')).toHaveTextContent('?query=value');
      expect(screen.getByTestId('hash')).toHaveTextContent('#section');
    });
  });

  describe('navigation type tracking', () => {
    it('should track PUSH navigation type', async () => {
      const user = userEvent.setup();

      // eslint-disable-next-line @typescript-eslint/naming-convention
      function NavTypeHarness(): ReactElement {
        const { navigationType, navigate } = useRouterContext();
        return (
          <div>
            <div data-testid="navType">{navigationType}</div>
            <button onClick={() => { navigate('/test'); }}>Navigate</button>
          </div>
        );
      }

      render(
        <MemoryRouter>
          <NavTypeHarness />
        </MemoryRouter>,
      );

      expect(screen.getByTestId('navType')).toHaveTextContent('POP');

      await user.click(screen.getByText('Navigate'));
      expect(screen.getByTestId('navType')).toHaveTextContent('PUSH');
    });

    it('should track REPLACE navigation type', async () => {
      const user = userEvent.setup();

      // eslint-disable-next-line @typescript-eslint/naming-convention
      function NavTypeHarness(): ReactElement {
        const { navigationType, navigate } = useRouterContext();
        return (
          <div>
            <div data-testid="navType">{navigationType}</div>
            <button onClick={() => { navigate('/test', { replace: true }); }}>Replace</button>
          </div>
        );
      }

      render(
        <MemoryRouter>
          <NavTypeHarness />
        </MemoryRouter>,
      );

      await user.click(screen.getByText('Replace'));
      expect(screen.getByTestId('navType')).toHaveTextContent('REPLACE');
    });

    it('should track POP navigation type on back/forward', async () => {
      const user = userEvent.setup();

      // eslint-disable-next-line @typescript-eslint/naming-convention
      function NavTypeHarness(): ReactElement {
        const { navigationType, navigate } = useRouterContext();
        return (
          <div>
            <div data-testid="navType">{navigationType}</div>
            <button onClick={() => { navigate('/test'); }}>Navigate</button>
            <button onClick={() => { navigate(-1); }}>Back</button>
          </div>
        );
      }

      render(
        <MemoryRouter>
          <NavTypeHarness />
        </MemoryRouter>,
      );

      await user.click(screen.getByText('Navigate'));
      expect(screen.getByTestId('navType')).toHaveTextContent('PUSH');

      await user.click(screen.getByText('Back'));
      expect(screen.getByTestId('navType')).toHaveTextContent('POP');
    });
  });

  describe('setLocation helper', () => {
    it('should expose setLocation for direct location updates', async () => {
      const user = userEvent.setup();

      // eslint-disable-next-line @typescript-eslint/naming-convention
      function SetLocationHarness(): ReactElement {
        const { location, setLocation } = useRouterContext();

        const handleSetLocation = (): void => {
          if (setLocation !== undefined) {
            const newLocation: RouterLocation = {
              pathname: '/direct',
              search: '?test=true',
              hash: '#hash',
              state: { direct: true },
              key: 'test-key',
            };
            setLocation(newLocation);
          }
        };

        return (
          <div>
            <div data-testid="pathname">{location.pathname}</div>
            <div data-testid="search">{location.search}</div>
            <div data-testid="hash">{location.hash}</div>
            <button onClick={handleSetLocation}>Set Location</button>
          </div>
        );
      }

      render(
        <MemoryRouter>
          <SetLocationHarness />
        </MemoryRouter>,
      );

      expect(screen.getByTestId('pathname')).toHaveTextContent('/');

      await user.click(screen.getByText('Set Location'));

      await waitFor(() => {
        expect(screen.getByTestId('pathname')).toHaveTextContent('/direct');
        expect(screen.getByTestId('search')).toHaveTextContent('?test=true');
        expect(screen.getByTestId('hash')).toHaveTextContent('#hash');
      });
    });
  });

  describe('edge cases', () => {
    it('should handle empty initial entries', () => {
      render(
        <MemoryRouter initialEntries={[]}>
          <MemoryRouterHarness />
        </MemoryRouter>,
      );

      // Should default to "/"
      expect(screen.getByTestId('pathname')).toHaveTextContent('/');
    });

    it('should generate unique keys for each entry', async () => {
      const user = userEvent.setup();

      // eslint-disable-next-line @typescript-eslint/naming-convention
      function KeyHarness(): ReactElement {
        const { location, navigate } = useRouterContext();
        return (
          <div>
            <div data-testid="key">{location.key}</div>
            <button onClick={() => { navigate('/test'); }}>Navigate</button>
          </div>
        );
      }

      render(
        <MemoryRouter>
          <KeyHarness />
        </MemoryRouter>,
      );

      const initialKey = screen.getByTestId('key').textContent;

      await user.click(screen.getByText('Navigate'));

      const newKey = screen.getByTestId('key').textContent;

      expect(initialKey).not.toBe(newKey);
      expect(newKey).toHaveLength(8);
    });
  });
});

// ============================================================================
// Hook Tests
// ============================================================================

describe('useRouterContext', () => {
  it('should provide router context value', () => {
    render(
      <MemoryRouter>
        <RouterHarness />
      </MemoryRouter>,
    );

    expect(screen.getByTestId('pathname')).toBeInTheDocument();
    expect(screen.getByTestId('navType')).toBeInTheDocument();
  });

  it('should throw error when used outside Router', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

    // eslint-disable-next-line @typescript-eslint/naming-convention
    function InvalidConsumer(): ReactElement {
      const context = useRouterContext();
      return <div>{context.location.pathname}</div>;
    }

    expect(() => {
      render(<InvalidConsumer />);
    }).toThrow('useRouterContext must be used within a Router');

    consoleError.mockRestore();
  });

  it('should provide navigate function', async () => {
    const user = userEvent.setup();

    // eslint-disable-next-line @typescript-eslint/naming-convention
    function NavigateHarness(): ReactElement {
      const { navigate, location } = useRouterContext();
      return (
        <div>
          <div data-testid="pathname">{location.pathname}</div>
          <button onClick={() => { navigate('/test'); }}>Navigate</button>
        </div>
      );
    }

    render(
      <MemoryRouter>
        <NavigateHarness />
      </MemoryRouter>,
    );

    await user.click(screen.getByText('Navigate'));
    expect(screen.getByTestId('pathname')).toHaveTextContent('/test');
  });
});

describe('useNavigationType', () => {
  it('should return current navigation type', () => {
    render(
      <MemoryRouter>
        <NavigationTypeHarness />
      </MemoryRouter>,
    );

    expect(screen.getByTestId('navType')).toHaveTextContent('POP');
  });

  it('should update when navigation type changes', async () => {
    const user = userEvent.setup();

    // eslint-disable-next-line @typescript-eslint/naming-convention
    function NavTypeChangeHarness(): ReactElement {
      const navType = useNavigationType();
      const { navigate } = useRouterContext();

      return (
        <div>
          <div data-testid="navType">{navType}</div>
          <button onClick={() => { navigate('/test'); }}>Navigate</button>
        </div>
      );
    }

    render(
      <MemoryRouter>
        <NavTypeChangeHarness />
      </MemoryRouter>,
    );

    expect(screen.getByTestId('navType')).toHaveTextContent('POP');

    await user.click(screen.getByText('Navigate'));
    expect(screen.getByTestId('navType')).toHaveTextContent('PUSH');
  });

  it('should throw error when used outside Router', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => {
      render(<NavigationTypeHarness />);
    }).toThrow('useRouterContext must be used within a Router');

    consoleError.mockRestore();
  });
});

describe('useHistory', () => {
  it('should return browser history even in MemoryRouter', () => {
    // useHistory returns the browser history singleton, not router-specific history
    // This is by design - it provides access to browser navigation APIs
    render(
      <MemoryRouter>
        <HistoryHarness />
      </MemoryRouter>,
    );

    expect(screen.getByTestId('hasHistory')).toHaveTextContent('true');
  });

  it('should return history object in Browser Router', () => {
    render(
      <Router>
        <HistoryHarness />
      </Router>,
    );

    expect(screen.getByTestId('hasHistory')).toHaveTextContent('true');
  });

  it('should provide working history methods', async () => {
    const user = userEvent.setup();

    render(
      <Router>
        <HistoryHarness />
      </Router>,
    );

    await user.click(screen.getByText('History Push'));

    await waitFor(() => {
      expect(window.location.pathname).toBe('/test');
    });
  });
});

// ============================================================================
// RouterContext Direct Tests
// ============================================================================

describe('RouterContext', () => {
  it('should be createable with custom value', () => {
    const mockNavigate: NavigateFunction = vi.fn();
    const mockLocation: RouterLocation = {
      pathname: '/custom',
      search: '',
      hash: '',
      state: null,
      key: 'custom-key',
    };
    const mockNavigationType: NavigationType = 'PUSH';

    // eslint-disable-next-line @typescript-eslint/naming-convention
    function CustomConsumer(): ReactElement {
      const context = useRouterContext();
      return (
        <div>
          <div data-testid="pathname">{context.location.pathname}</div>
          <div data-testid="navType">{context.navigationType}</div>
        </div>
      );
    }

    render(
      <RouterContext.Provider
        value={{
          location: mockLocation,
          navigationType: mockNavigationType,
          navigate: mockNavigate,
        }}
      >
        <CustomConsumer />
      </RouterContext.Provider>,
    );

    expect(screen.getByTestId('pathname')).toHaveTextContent('/custom');
    expect(screen.getByTestId('navType')).toHaveTextContent('PUSH');
  });
});

// ============================================================================
// Integration Tests
// ============================================================================

describe('Router Integration', () => {
  it('should handle complex navigation flows', async () => {
    const user = userEvent.setup();

    // eslint-disable-next-line @typescript-eslint/naming-convention
    function ComplexHarness(): ReactElement {
      const { location, navigate } = useRouterContext();
      return (
        <div>
          <div data-testid="pathname">{location.pathname}</div>
          <button onClick={() => { navigate('/step1'); }}>Step 1</button>
          <button onClick={() => { navigate('/step2', { state: { step: 2 } }); }}>Step 2</button>
          <button onClick={() => { navigate('/step3', { replace: true }); }}>Step 3 Replace</button>
          <button onClick={() => { navigate(-1); }}>Back</button>
        </div>
      );
    }

    render(
      <MemoryRouter>
        <ComplexHarness />
      </MemoryRouter>,
    );

    // Navigate through steps
    await user.click(screen.getByText('Step 1'));
    expect(screen.getByTestId('pathname')).toHaveTextContent('/step1');

    await user.click(screen.getByText('Step 2'));
    expect(screen.getByTestId('pathname')).toHaveTextContent('/step2');

    await user.click(screen.getByText('Step 3 Replace'));
    expect(screen.getByTestId('pathname')).toHaveTextContent('/step3');

    // Back should go to step1 (step2 was replaced)
    await user.click(screen.getByText('Back'));
    expect(screen.getByTestId('pathname')).toHaveTextContent('/step1');
  });

  it('should handle nested providers (inner should take precedence)', () => {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    function OuterConsumer(): ReactElement {
      const { location } = useRouterContext();
      return <div data-testid="outer-pathname">{location.pathname}</div>;
    }

    // eslint-disable-next-line @typescript-eslint/naming-convention
    function InnerConsumer(): ReactElement {
      const { location } = useRouterContext();
      return <div data-testid="inner-pathname">{location.pathname}</div>;
    }

    render(
      <MemoryRouter initialEntries={['/outer']}>
        <OuterConsumer />
        <MemoryRouter initialEntries={['/inner']}>
          <InnerConsumer />
        </MemoryRouter>
      </MemoryRouter>,
    );

    expect(screen.getByTestId('outer-pathname')).toHaveTextContent('/outer');
    expect(screen.getByTestId('inner-pathname')).toHaveTextContent('/inner');
  });
});
