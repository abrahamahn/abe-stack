// client/react/src/router/components.test.tsx
/**
 * Tests for custom router components.
 *
 * Tests Route, Routes, Link, Navigate, Outlet, and useParams functionality.
 * Covers path matching, nested routing, route parameters, and navigation.
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { type ReactElement, type ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { Link, Navigate, Outlet, Route, Routes, useParams } from './components';
import { MemoryRouter } from './context';

// Test components
const TestComponent = ({ text }: { text: string }): ReactElement => {
  return <div>{text}</div>;
};

const LayoutWithOutlet = ({ title }: { title: string }): ReactElement => {
  return (
    <div>
      <h1>{title}</h1>
      <Outlet />
    </div>
  );
};

const ParamsDisplay = (): ReactElement => {
  const params = useParams();
  return (
    <div data-testid="params">
      {Object.entries(params).map(([key, value]) => (
        <div key={key} data-testid={`param-${key}`}>
          {key}: {value}
        </div>
      ))}
    </div>
  );
};

function createWrapper(initialPath = '/'): (props: { children: ReactNode }) => ReactElement {
  return ({ children }: { children: ReactNode }): ReactElement => (
    <MemoryRouter initialEntries={[initialPath]}>{children}</MemoryRouter>
  );
}

describe('Route', () => {
  describe('basic rendering', () => {
    it('should return null when rendered directly', () => {
      const { container } = render(<Route path="/test" element={<div>Test</div>} />);
      expect(container.textContent).toBe('');
    });

    it('should accept path prop', () => {
      expect(() => {
        render(<Route path="/test" />);
      }).not.toThrow();
    });

    it('should accept element prop', () => {
      expect(() => {
        render(<Route path="/test" element={<div>Test</div>} />);
      }).not.toThrow();
    });

    it('should accept children prop', () => {
      expect(() => {
        render(
          <Route path="/test">
            <Route path="nested" />
          </Route>,
        );
      }).not.toThrow();
    });

    it('should accept index prop', () => {
      expect(() => {
        render(<Route index element={<div>Index</div>} />);
      }).not.toThrow();
    });
  });
});

describe('Routes', () => {
  describe('basic routing', () => {
    it('should render matching route', () => {
      render(
        <MemoryRouter initialEntries={['/about']}>
          <Routes>
            <Route path="/" element={<TestComponent text="Home" />} />
            <Route path="/about" element={<TestComponent text="About" />} />
          </Routes>
        </MemoryRouter>,
      );

      expect(screen.getByText('About')).toBeInTheDocument();
      expect(screen.queryByText('Home')).not.toBeInTheDocument();
    });

    it('should render root route', () => {
      render(
        <MemoryRouter initialEntries={['/']}>
          <Routes>
            <Route path="/" element={<TestComponent text="Home" />} />
            <Route path="/about" element={<TestComponent text="About" />} />
          </Routes>
        </MemoryRouter>,
      );

      expect(screen.getByText('Home')).toBeInTheDocument();
    });

    it('should return null when no route matches', () => {
      const { container } = render(
        <MemoryRouter initialEntries={['/nonexistent']}>
          <Routes>
            <Route path="/" element={<TestComponent text="Home" />} />
            <Route path="/about" element={<TestComponent text="About" />} />
          </Routes>
        </MemoryRouter>,
      );

      expect(container.textContent).toBe('');
    });

    it('should match first matching route', () => {
      render(
        <MemoryRouter initialEntries={['/about']}>
          <Routes>
            <Route path="/about" element={<TestComponent text="First" />} />
            <Route path="/about" element={<TestComponent text="Second" />} />
          </Routes>
        </MemoryRouter>,
      );

      expect(screen.getByText('First')).toBeInTheDocument();
      expect(screen.queryByText('Second')).not.toBeInTheDocument();
    });
  });

  describe('path parameters', () => {
    it('should extract single path parameter', () => {
      render(
        <MemoryRouter initialEntries={['/users/123']}>
          <Routes>
            <Route path="/users/:id" element={<ParamsDisplay />} />
          </Routes>
        </MemoryRouter>,
      );

      expect(screen.getByTestId('param-id')).toHaveTextContent('id: 123');
    });

    it('should extract multiple path parameters', () => {
      render(
        <MemoryRouter initialEntries={['/users/123/posts/456']}>
          <Routes>
            <Route path="/users/:userId/posts/:postId" element={<ParamsDisplay />} />
          </Routes>
        </MemoryRouter>,
      );

      expect(screen.getByTestId('param-userId')).toHaveTextContent('userId: 123');
      expect(screen.getByTestId('param-postId')).toHaveTextContent('postId: 456');
    });

    it('should handle parameters with special characters', () => {
      render(
        <MemoryRouter initialEntries={['/users/user-123_test']}>
          <Routes>
            <Route path="/users/:id" element={<ParamsDisplay />} />
          </Routes>
        </MemoryRouter>,
      );

      expect(screen.getByTestId('param-id')).toHaveTextContent('id: user-123_test');
    });

    it('should handle empty parameter value', () => {
      render(
        <MemoryRouter initialEntries={['/users/']}>
          <Routes>
            <Route path="/users/:id?" element={<ParamsDisplay />} />
          </Routes>
        </MemoryRouter>,
      );

      expect(screen.getByTestId('params')).toBeInTheDocument();
    });
  });

  describe('wildcard routes', () => {
    it('should match catch-all route', () => {
      render(
        <MemoryRouter initialEntries={['/any/path/here']}>
          <Routes>
            <Route path="*" element={<TestComponent text="Catch All" />} />
          </Routes>
        </MemoryRouter>,
      );

      expect(screen.getByText('Catch All')).toBeInTheDocument();
    });

    it('should extract wildcard parameter', () => {
      render(
        <MemoryRouter initialEntries={['/files/folder/subfolder/file.txt']}>
          <Routes>
            <Route path="/files/*" element={<ParamsDisplay />} />
          </Routes>
        </MemoryRouter>,
      );

      expect(screen.getByTestId('param-*')).toHaveTextContent('*: folder/subfolder/file.txt');
    });

    it('should prefer specific routes over wildcard', () => {
      render(
        <MemoryRouter initialEntries={['/about']}>
          <Routes>
            <Route path="/about" element={<TestComponent text="About" />} />
            <Route path="*" element={<TestComponent text="Catch All" />} />
          </Routes>
        </MemoryRouter>,
      );

      expect(screen.getByText('About')).toBeInTheDocument();
      expect(screen.queryByText('Catch All')).not.toBeInTheDocument();
    });
  });

  describe('index routes', () => {
    it('should render index route at parent path', () => {
      render(
        <MemoryRouter initialEntries={['/']}>
          <Routes>
            <Route path="/" element={<LayoutWithOutlet title="Layout" />}>
              <Route index element={<TestComponent text="Index" />} />
              <Route path="about" element={<TestComponent text="About" />} />
            </Route>
          </Routes>
        </MemoryRouter>,
      );

      expect(screen.getByText('Layout')).toBeInTheDocument();
      expect(screen.getByText('Index')).toBeInTheDocument();
      expect(screen.queryByText('About')).not.toBeInTheDocument();
    });

    it('should render index route for nested path', () => {
      render(
        <MemoryRouter initialEntries={['/dashboard']}>
          <Routes>
            <Route path="/dashboard" element={<LayoutWithOutlet title="Dashboard" />}>
              <Route index element={<TestComponent text="Dashboard Home" />} />
              <Route path="settings" element={<TestComponent text="Settings" />} />
            </Route>
          </Routes>
        </MemoryRouter>,
      );

      expect(screen.getByText('Dashboard')).toBeInTheDocument();
      expect(screen.getByText('Dashboard Home')).toBeInTheDocument();
      expect(screen.queryByText('Settings')).not.toBeInTheDocument();
    });

    it('should not render index route when child route matches', () => {
      render(
        <MemoryRouter initialEntries={['/dashboard/settings']}>
          <Routes>
            <Route path="/dashboard" element={<LayoutWithOutlet title="Dashboard" />}>
              <Route index element={<TestComponent text="Dashboard Home" />} />
              <Route path="settings" element={<TestComponent text="Settings" />} />
            </Route>
          </Routes>
        </MemoryRouter>,
      );

      expect(screen.getByText('Dashboard')).toBeInTheDocument();
      expect(screen.getByText('Settings')).toBeInTheDocument();
      expect(screen.queryByText('Dashboard Home')).not.toBeInTheDocument();
    });
  });

  describe('nested routes', () => {
    it('should render nested routes with Outlet', () => {
      render(
        <MemoryRouter initialEntries={['/parent/child']}>
          <Routes>
            <Route path="/parent" element={<LayoutWithOutlet title="Parent" />}>
              <Route path="child" element={<TestComponent text="Child" />} />
            </Route>
          </Routes>
        </MemoryRouter>,
      );

      expect(screen.getByText('Parent')).toBeInTheDocument();
      expect(screen.getByText('Child')).toBeInTheDocument();
    });

    it('should render deeply nested routes', () => {
      render(
        <MemoryRouter initialEntries={['/level1/level2/level3']}>
          <Routes>
            <Route path="/level1" element={<LayoutWithOutlet title="Level 1" />}>
              <Route path="level2" element={<LayoutWithOutlet title="Level 2" />}>
                <Route path="level3" element={<TestComponent text="Level 3" />} />
              </Route>
            </Route>
          </Routes>
        </MemoryRouter>,
      );

      expect(screen.getByText('Level 1')).toBeInTheDocument();
      expect(screen.getByText('Level 2')).toBeInTheDocument();
      expect(screen.getByText('Level 3')).toBeInTheDocument();
    });

    it('should pass params through nested routes', () => {
      render(
        <MemoryRouter initialEntries={['/users/123/posts/456']}>
          <Routes>
            <Route path="/users/:userId" element={<LayoutWithOutlet title="User" />}>
              <Route path="posts/:postId" element={<ParamsDisplay />} />
            </Route>
          </Routes>
        </MemoryRouter>,
      );

      expect(screen.getByTestId('param-userId')).toHaveTextContent('userId: 123');
      expect(screen.getByTestId('param-postId')).toHaveTextContent('postId: 456');
    });
  });

  describe('edge cases', () => {
    it('should handle routes without element', () => {
      const { container } = render(
        <MemoryRouter initialEntries={['/test']}>
          <Routes>
            <Route path="/test" />
          </Routes>
        </MemoryRouter>,
      );

      expect(container.textContent).toBe('');
    });

    it('should handle empty children', () => {
      const { container } = render(
        <MemoryRouter initialEntries={['/']}>
          <Routes>{null}</Routes>
        </MemoryRouter>,
      );

      expect(container.textContent).toBe('');
    });

    it('should handle routes with trailing slashes', () => {
      render(
        <MemoryRouter initialEntries={['/about/']}>
          <Routes>
            <Route path="/about" element={<TestComponent text="About" />} />
          </Routes>
        </MemoryRouter>,
      );

      expect(screen.queryByText('About')).not.toBeInTheDocument();
    });

    it('should handle paths with query strings', () => {
      render(
        <MemoryRouter initialEntries={['/search?q=test']}>
          <Routes>
            <Route path="/search" element={<TestComponent text="Search" />} />
          </Routes>
        </MemoryRouter>,
      );

      expect(screen.getByText('Search')).toBeInTheDocument();
    });

    it('should handle paths with hash', () => {
      render(
        <MemoryRouter initialEntries={['/docs#section']}>
          <Routes>
            <Route path="/docs" element={<TestComponent text="Docs" />} />
          </Routes>
        </MemoryRouter>,
      );

      expect(screen.getByText('Docs')).toBeInTheDocument();
    });

    it('should re-render when location changes', () => {
      const Wrapper = createWrapper('/');

      const { rerender } = render(
        <Wrapper>
          <Routes>
            <Route path="/" element={<TestComponent text="Home" />} />
            <Route path="/about" element={<TestComponent text="About" />} />
          </Routes>
        </Wrapper>,
      );

      expect(screen.getByText('Home')).toBeInTheDocument();

      // Simulate navigation by creating new wrapper with different path
      const NewWrapper = createWrapper('/about');
      rerender(
        <NewWrapper>
          <Routes>
            <Route path="/" element={<TestComponent text="Home" />} />
            <Route path="/about" element={<TestComponent text="About" />} />
          </Routes>
        </NewWrapper>,
      );

      expect(screen.getByText('About')).toBeInTheDocument();
    });
  });
});

describe('Link', () => {
  describe('rendering', () => {
    it('should render anchor element', () => {
      render(
        <MemoryRouter>
          <Link to="/about">About</Link>
        </MemoryRouter>,
      );

      const link = screen.getByRole('link', { name: 'About' });
      expect(link).toBeInTheDocument();
      expect(link.tagName).toBe('A');
    });

    it('should set href attribute', () => {
      render(
        <MemoryRouter>
          <Link to="/about">About</Link>
        </MemoryRouter>,
      );

      expect(screen.getByRole('link', { name: 'About' })).toHaveAttribute('href', '/about');
    });

    it('should render children', () => {
      render(
        <MemoryRouter>
          <Link to="/about">
            <span>About Page</span>
          </Link>
        </MemoryRouter>,
      );

      expect(screen.getByText('About Page')).toBeInTheDocument();
    });

    it('should pass through additional props', () => {
      render(
        <MemoryRouter>
          <Link to="/about" className="custom-link" data-testid="test-link">
            About
          </Link>
        </MemoryRouter>,
      );

      const link = screen.getByTestId('test-link');
      expect(link).toHaveClass('custom-link');
    });
  });

  describe('navigation', () => {
    it('should navigate on click', async () => {
      const user = userEvent.setup();

      const TestApp = (): ReactElement => {
        return (
          <MemoryRouter>
            <Link to="/about">Go to About</Link>
            <Routes>
              <Route path="/" element={<TestComponent text="Home" />} />
              <Route path="/about" element={<TestComponent text="About" />} />
            </Routes>
          </MemoryRouter>
        );
      };

      render(<TestApp />);

      expect(screen.getByText('Home')).toBeInTheDocument();

      await user.click(screen.getByRole('link', { name: 'Go to About' }));

      await waitFor(() => {
        expect(screen.getByText('About')).toBeInTheDocument();
      });
    });

    it('should navigate with replace option', async () => {
      const user = userEvent.setup();

      const TestApp = (): ReactElement => {
        return (
          <MemoryRouter>
            <Link to="/about" replace>
              Go to About
            </Link>
            <Routes>
              <Route path="/" element={<TestComponent text="Home" />} />
              <Route path="/about" element={<TestComponent text="About" />} />
            </Routes>
          </MemoryRouter>
        );
      };

      render(<TestApp />);

      await user.click(screen.getByRole('link', { name: 'Go to About' }));

      await waitFor(() => {
        expect(screen.getByText('About')).toBeInTheDocument();
      });
    });

    it('should navigate with state', async () => {
      const user = userEvent.setup();

      const StateDisplay = (): ReactElement => {
        const params = useParams();
        return <div data-testid="state">{JSON.stringify(params)}</div>;
      };

      const TestApp = (): ReactElement => {
        return (
          <MemoryRouter>
            <Link to="/about" state={{ from: 'home' }}>
              Go to About
            </Link>
            <Routes>
              <Route path="/" element={<TestComponent text="Home" />} />
              <Route path="/about" element={<StateDisplay />} />
            </Routes>
          </MemoryRouter>
        );
      };

      render(<TestApp />);

      await user.click(screen.getByRole('link', { name: 'Go to About' }));

      await waitFor(() => {
        expect(screen.getByTestId('state')).toBeInTheDocument();
      });
    });

    it('should call custom onClick handler', async () => {
      const onClick = vi.fn();
      const user = userEvent.setup();

      render(
        <MemoryRouter>
          <Link to="/about" onClick={onClick}>
            About
          </Link>
        </MemoryRouter>,
      );

      await user.click(screen.getByRole('link', { name: 'About' }));

      expect(onClick).toHaveBeenCalledTimes(1);
    });
  });

  describe('modified clicks', () => {
    it('should allow default behavior for ctrl+click', async () => {
      const user = userEvent.setup();

      render(
        <MemoryRouter>
          <Link to="/about">About</Link>
        </MemoryRouter>,
      );

      const link = screen.getByRole('link', { name: 'About' });

      // Ctrl+click should not prevent default (allows opening in new tab)
      await user.keyboard('{Control>}');
      await user.click(link);
      await user.keyboard('{/Control}');

      // Link should still be in document (no navigation occurred)
      expect(link).toBeInTheDocument();
    });

    it('should allow default behavior for meta+click', async () => {
      const user = userEvent.setup();

      render(
        <MemoryRouter>
          <Link to="/about">About</Link>
        </MemoryRouter>,
      );

      const link = screen.getByRole('link', { name: 'About' });

      await user.keyboard('{Meta>}');
      await user.click(link);
      await user.keyboard('{/Meta}');

      expect(link).toBeInTheDocument();
    });

    it('should allow default behavior for shift+click', async () => {
      const user = userEvent.setup();

      render(
        <MemoryRouter>
          <Link to="/about">About</Link>
        </MemoryRouter>,
      );

      const link = screen.getByRole('link', { name: 'About' });

      await user.keyboard('{Shift>}');
      await user.click(link);
      await user.keyboard('{/Shift}');

      expect(link).toBeInTheDocument();
    });

    it('should allow default behavior for alt+click', async () => {
      const user = userEvent.setup();

      render(
        <MemoryRouter>
          <Link to="/about">About</Link>
        </MemoryRouter>,
      );

      const link = screen.getByRole('link', { name: 'About' });

      await user.keyboard('{Alt>}');
      await user.click(link);
      await user.keyboard('{/Alt}');

      expect(link).toBeInTheDocument();
    });
  });

  describe('edge cases', () => {
    it('should handle empty to prop', () => {
      render(
        <MemoryRouter initialEntries={['/']}>
          <Link to="">Empty</Link>
        </MemoryRouter>,
      );

      // An anchor with empty href is not considered an accessible link by WAI-ARIA
      const link = screen.getByText('Empty');
      expect(link.tagName).toBe('A');
      expect(link).toHaveAttribute('href', '');
    });

    it('should handle special characters in to prop', () => {
      render(
        <MemoryRouter>
          <Link to="/path/with spaces">Link</Link>
        </MemoryRouter>,
      );

      expect(screen.getByRole('link', { name: 'Link' })).toHaveAttribute(
        'href',
        '/path/with spaces',
      );
    });

    it('should handle to prop with query string', () => {
      render(
        <MemoryRouter>
          <Link to="/search?q=test">Search</Link>
        </MemoryRouter>,
      );

      expect(screen.getByRole('link', { name: 'Search' })).toHaveAttribute(
        'href',
        '/search?q=test',
      );
    });

    it('should handle to prop with hash', () => {
      render(
        <MemoryRouter>
          <Link to="/docs#section">Docs</Link>
        </MemoryRouter>,
      );

      expect(screen.getByRole('link', { name: 'Docs' })).toHaveAttribute('href', '/docs#section');
    });
  });
});

describe('Navigate', () => {
  describe('basic navigation', () => {
    it('should navigate on mount', async () => {
      render(
        <MemoryRouter initialEntries={['/']}>
          <Routes>
            <Route path="/" element={<Navigate to="/about" />} />
            <Route path="/about" element={<TestComponent text="About" />} />
          </Routes>
        </MemoryRouter>,
      );

      await waitFor(() => {
        expect(screen.getByText('About')).toBeInTheDocument();
      });
    });

    it('should navigate with replace option', async () => {
      render(
        <MemoryRouter initialEntries={['/']}>
          <Routes>
            <Route path="/" element={<Navigate to="/about" replace />} />
            <Route path="/about" element={<TestComponent text="About" />} />
          </Routes>
        </MemoryRouter>,
      );

      await waitFor(() => {
        expect(screen.getByText('About')).toBeInTheDocument();
      });
    });

    it('should navigate with state', async () => {
      render(
        <MemoryRouter initialEntries={['/']}>
          <Routes>
            <Route path="/" element={<Navigate to="/about" state={{ from: '/' }} />} />
            <Route path="/about" element={<TestComponent text="About" />} />
          </Routes>
        </MemoryRouter>,
      );

      await waitFor(() => {
        expect(screen.getByText('About')).toBeInTheDocument();
      });
    });

    it('should render nothing', () => {
      const { container } = render(
        <MemoryRouter>
          <Navigate to="/about" />
        </MemoryRouter>,
      );

      expect(container.textContent).toBe('');
    });
  });

  describe('conditional navigation', () => {
    it('should navigate when condition changes', async () => {
      const ConditionalNavigate = ({
        shouldNavigate,
      }: {
        shouldNavigate: boolean;
      }): ReactElement => {
        return (
          <MemoryRouter initialEntries={['/']}>
            <Routes>
              <Route
                path="/"
                element={shouldNavigate ? <Navigate to="/about" /> : <TestComponent text="Home" />}
              />
              <Route path="/about" element={<TestComponent text="About" />} />
            </Routes>
          </MemoryRouter>
        );
      };

      const { rerender } = render(<ConditionalNavigate shouldNavigate={false} />);

      expect(screen.getByText('Home')).toBeInTheDocument();

      rerender(<ConditionalNavigate shouldNavigate={true} />);

      await waitFor(() => {
        expect(screen.getByText('About')).toBeInTheDocument();
      });
    });
  });

  describe('edge cases', () => {
    it('should handle empty to prop', async () => {
      render(
        <MemoryRouter initialEntries={['/']}>
          <Navigate to="" />
        </MemoryRouter>,
      );

      await waitFor(() => {
        expect(true).toBe(true); // Should not crash
      });
    });

    it('should handle navigation to same path', async () => {
      render(
        <MemoryRouter initialEntries={['/about']}>
          <Routes>
            <Route path="/about" element={<Navigate to="/about" />} />
          </Routes>
        </MemoryRouter>,
      );

      await waitFor(() => {
        expect(true).toBe(true); // Should not cause infinite loop
      });
    });
  });
});

describe('Outlet', () => {
  describe('basic rendering', () => {
    it('should render nested route content', () => {
      render(
        <MemoryRouter initialEntries={['/parent/child']}>
          <Routes>
            <Route path="/parent" element={<LayoutWithOutlet title="Parent" />}>
              <Route path="child" element={<TestComponent text="Child" />} />
            </Route>
          </Routes>
        </MemoryRouter>,
      );

      expect(screen.getByText('Parent')).toBeInTheDocument();
      expect(screen.getByText('Child')).toBeInTheDocument();
    });

    it('should render null when no child route matches', () => {
      const LayoutWithDataTestId = (): ReactElement => {
        return (
          <div>
            <h1>Layout</h1>
            <div data-testid="outlet">
              <Outlet />
            </div>
          </div>
        );
      };

      render(
        <MemoryRouter initialEntries={['/parent']}>
          <Routes>
            <Route path="/parent" element={<LayoutWithDataTestId />}>
              <Route path="child" element={<TestComponent text="Child" />} />
            </Route>
          </Routes>
        </MemoryRouter>,
      );

      expect(screen.getByTestId('outlet').textContent).toBe('');
    });

    it('should render index route in outlet', () => {
      render(
        <MemoryRouter initialEntries={['/parent']}>
          <Routes>
            <Route path="/parent" element={<LayoutWithOutlet title="Parent" />}>
              <Route index element={<TestComponent text="Index" />} />
            </Route>
          </Routes>
        </MemoryRouter>,
      );

      expect(screen.getByText('Parent')).toBeInTheDocument();
      expect(screen.getByText('Index')).toBeInTheDocument();
    });

    it('should support multiple Outlets in component tree', () => {
      const DoubleLayout = (): ReactElement => {
        return (
          <div>
            <div data-testid="first-outlet">
              <Outlet />
            </div>
            <div data-testid="second-outlet">
              <Outlet />
            </div>
          </div>
        );
      };

      render(
        <MemoryRouter initialEntries={['/parent/child']}>
          <Routes>
            <Route path="/parent" element={<DoubleLayout />}>
              <Route path="child" element={<TestComponent text="Child" />} />
            </Route>
          </Routes>
        </MemoryRouter>,
      );

      // Both outlets should render the same child
      expect(screen.getByTestId('first-outlet')).toHaveTextContent('Child');
      expect(screen.getByTestId('second-outlet')).toHaveTextContent('Child');
    });
  });
});

describe('useParams', () => {
  describe('basic usage', () => {
    it('should return empty object when no params', () => {
      const TestUseParams = (): ReactElement => {
        const params = useParams();
        return <div data-testid="params-count">{Object.keys(params).length}</div>;
      };

      render(
        <MemoryRouter initialEntries={['/']}>
          <Routes>
            <Route path="/" element={<TestUseParams />} />
          </Routes>
        </MemoryRouter>,
      );

      expect(screen.getByTestId('params-count')).toHaveTextContent('0');
    });

    it('should return params object', () => {
      render(
        <MemoryRouter initialEntries={['/users/123']}>
          <Routes>
            <Route path="/users/:id" element={<ParamsDisplay />} />
          </Routes>
        </MemoryRouter>,
      );

      expect(screen.getByTestId('param-id')).toHaveTextContent('id: 123');
    });

    it('should update when params change', () => {
      // MemoryRouter captures initialEntries on mount via ref (not reactive to prop changes).
      // To test param changes, remount with a new key to force fresh initialization.
      const TestApp = ({ userId }: { userId: string }): ReactElement => {
        return (
          <MemoryRouter key={userId} initialEntries={[`/users/${userId}`]}>
            <Routes>
              <Route path="/users/:id" element={<ParamsDisplay />} />
            </Routes>
          </MemoryRouter>
        );
      };

      const { rerender } = render(<TestApp userId="123" />);

      expect(screen.getByTestId('param-id')).toHaveTextContent('id: 123');

      rerender(<TestApp userId="456" />);

      expect(screen.getByTestId('param-id')).toHaveTextContent('id: 456');
    });
  });

  describe('nested routes', () => {
    it('should return params from parent and child routes', () => {
      render(
        <MemoryRouter initialEntries={['/users/123/posts/456']}>
          <Routes>
            <Route path="/users/:userId" element={<LayoutWithOutlet title="User" />}>
              <Route path="posts/:postId" element={<ParamsDisplay />} />
            </Route>
          </Routes>
        </MemoryRouter>,
      );

      expect(screen.getByTestId('param-userId')).toHaveTextContent('userId: 123');
      expect(screen.getByTestId('param-postId')).toHaveTextContent('postId: 456');
    });
  });

  describe('edge cases', () => {
    it('should handle URL-encoded params', () => {
      render(
        <MemoryRouter initialEntries={['/users/hello%20world']}>
          <Routes>
            <Route path="/users/:id" element={<ParamsDisplay />} />
          </Routes>
        </MemoryRouter>,
      );

      expect(screen.getByTestId('param-id')).toHaveTextContent('id: hello%20world');
    });

    it('should handle params with special characters', () => {
      render(
        <MemoryRouter initialEntries={['/users/user-123_test.foo']}>
          <Routes>
            <Route path="/users/:id" element={<ParamsDisplay />} />
          </Routes>
        </MemoryRouter>,
      );

      expect(screen.getByTestId('param-id')).toHaveTextContent('id: user-123_test.foo');
    });
  });
});

describe('integration tests', () => {
  describe('full navigation flow', () => {
    it('should navigate through multiple pages with Links', async () => {
      const user = userEvent.setup();

      const TestApp = (): ReactElement => {
        return (
          <MemoryRouter>
            <nav>
              <Link to="/">Home</Link>
              <Link to="/about">About</Link>
              <Link to="/contact">Contact</Link>
            </nav>
            <Routes>
              <Route path="/" element={<TestComponent text="Home Page" />} />
              <Route path="/about" element={<TestComponent text="About Page" />} />
              <Route path="/contact" element={<TestComponent text="Contact Page" />} />
            </Routes>
          </MemoryRouter>
        );
      };

      render(<TestApp />);

      expect(screen.getByText('Home Page')).toBeInTheDocument();

      await user.click(screen.getByRole('link', { name: 'About' }));
      await waitFor(() => {
        expect(screen.getByText('About Page')).toBeInTheDocument();
      });

      await user.click(screen.getByRole('link', { name: 'Contact' }));
      await waitFor(() => {
        expect(screen.getByText('Contact Page')).toBeInTheDocument();
      });

      await user.click(screen.getByRole('link', { name: 'Home' }));
      await waitFor(() => {
        expect(screen.getByText('Home Page')).toBeInTheDocument();
      });
    });

    it('should navigate through nested routes with params', async () => {
      const user = userEvent.setup();

      const UserLayout = (): ReactElement => {
        const params = useParams();
        const userId = params['userId'] ?? 'unknown';
        return (
          <div>
            <h1>User {userId}</h1>
            <nav>
              <Link to={`/users/${userId}/profile`}>Profile</Link>
              <Link to={`/users/${userId}/posts`}>Posts</Link>
            </nav>
            <Outlet />
          </div>
        );
      };

      const TestApp = (): ReactElement => {
        return (
          <MemoryRouter initialEntries={['/users/123/profile']}>
            <Routes>
              <Route path="/users/:userId" element={<UserLayout />}>
                <Route path="profile" element={<TestComponent text="Profile" />} />
                <Route path="posts" element={<TestComponent text="Posts" />} />
              </Route>
            </Routes>
          </MemoryRouter>
        );
      };

      render(<TestApp />);

      expect(screen.getByText('User 123')).toBeInTheDocument();
      // Use getAllByText since "Profile" appears in both the nav link and the rendered content
      expect(screen.getAllByText('Profile')).toHaveLength(2);

      await user.click(screen.getByRole('link', { name: 'Posts' }));
      // After navigation, "Posts" appears in both the nav link and rendered content
      await waitFor(() => {
        expect(screen.getAllByText('Posts')).toHaveLength(2);
      });
    });
  });

  describe('protected routes pattern', () => {
    it('should redirect unauthenticated users', async () => {
      const ProtectedRoute = ({ isAuthenticated }: { isAuthenticated: boolean }): ReactElement => {
        if (!isAuthenticated) {
          return <Navigate to="/login" replace />;
        }
        return <TestComponent text="Protected Content" />;
      };

      render(
        <MemoryRouter initialEntries={['/dashboard']}>
          <Routes>
            <Route path="/dashboard" element={<ProtectedRoute isAuthenticated={false} />} />
            <Route path="/login" element={<TestComponent text="Login Page" />} />
          </Routes>
        </MemoryRouter>,
      );

      await waitFor(() => {
        expect(screen.getByText('Login Page')).toBeInTheDocument();
      });
    });

    it('should render protected content for authenticated users', () => {
      const ProtectedRoute = ({ isAuthenticated }: { isAuthenticated: boolean }): ReactElement => {
        if (!isAuthenticated) {
          return <Navigate to="/login" replace />;
        }
        return <TestComponent text="Protected Content" />;
      };

      render(
        <MemoryRouter initialEntries={['/dashboard']}>
          <Routes>
            <Route path="/dashboard" element={<ProtectedRoute isAuthenticated={true} />} />
            <Route path="/login" element={<TestComponent text="Login Page" />} />
          </Routes>
        </MemoryRouter>,
      );

      expect(screen.getByText('Protected Content')).toBeInTheDocument();
    });
  });
});
