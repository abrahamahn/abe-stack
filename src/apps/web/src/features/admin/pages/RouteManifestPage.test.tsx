// src/apps/web/src/features/admin/pages/RouteManifestPage.test.tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { RouteManifestPage } from './RouteManifestPage';

vi.mock('@abe-stack/ui', () => {
  const heading = ({ children, as }: { children: any; as?: string }) => {
    if (as === 'h1') return <h1>{children}</h1>;
    if (as === 'h3') return <h3>{children}</h3>;
    if (as === 'h4') return <h4>{children}</h4>;
    return <h2>{children}</h2>;
  };

  return {
    Badge: ({ children }: { children: any }) => <span>{children}</span>,
    Heading: heading,
    Input: ({
      onChange,
      ...props
    }: {
      onChange?: (event: { target: { value: string } }) => void;
    }) => (
      <input
        {...props}
        onChange={(event) => {
          onChange?.(event);
        }}
      />
    ),
    PageContainer: ({ children }: { children: any }) => (
      <div data-testid="page-container">{children}</div>
    ),
    Select: ({
      children,
      onChange,
      value,
      ...rest
    }: {
      children: any;
      onChange?: (value: string) => void;
      value?: string;
    }) => (
      <select
        {...rest}
        value={value}
        onChange={(event) => {
          onChange?.(event.target.value);
        }}
      >
        {children}
      </select>
    ),
    Spinner: () => <div data-testid="spinner">Loading...</div>,
    Table: ({ children }: { children: any }) => <table>{children}</table>,
    TableBody: ({ children }: { children: any }) => <tbody>{children}</tbody>,
    TableCell: ({ children }: { children: any }) => <td>{children}</td>,
    TableHead: ({ children }: { children: any }) => <th>{children}</th>,
    TableHeader: ({ children }: { children: any }) => <thead>{children}</thead>,
    TableRow: ({ children }: { children: any }) => <tr>{children}</tr>,
    Checkbox: ({
      checked,
      onChange,
    }: {
      checked?: boolean;
      onChange?: (checked: boolean) => void;
    }) => (
      <input type="checkbox" checked={checked} onChange={(e) => onChange?.(e.target.checked)} />
    ),
    Text: ({ children }: { children: any }) => <span>{children}</span>,
  };
});

const mockUseRouteManifest = vi.fn();
vi.mock('../hooks/useRouteManifest', () => ({
  useRouteManifest: () => mockUseRouteManifest(),
}));

const mockRoutes = [
  {
    path: '/api/auth/login',
    method: 'POST',
    isPublic: true,
    roles: [],
    hasSchema: true,
    module: 'auth',
  },
  {
    path: '/api/users/me',
    method: 'GET',
    isPublic: false,
    roles: [],
    hasSchema: false,
    module: 'users',
  },
  {
    path: '/api/admin/users',
    method: 'GET',
    isPublic: false,
    roles: ['admin'],
    hasSchema: false,
    module: 'admin',
  },
];

describe('RouteManifestPage', () => {
  it('should show loading spinner while data is loading', () => {
    mockUseRouteManifest.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      error: null,
      refetch: vi.fn().mockResolvedValue(undefined),
    });

    render(<RouteManifestPage />);
    expect(screen.getByTestId('spinner')).toBeInTheDocument();
  });

  it('should show error message on failure', () => {
    mockUseRouteManifest.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: new Error('Network failure'),
      refetch: vi.fn().mockResolvedValue(undefined),
    });

    render(<RouteManifestPage />);
    expect(screen.getByText(/Network failure/)).toBeInTheDocument();
  });

  it('should render route data in a table', () => {
    mockUseRouteManifest.mockReturnValue({
      data: { routes: mockRoutes, count: 3 },
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn().mockResolvedValue(undefined),
    });

    render(<RouteManifestPage />);
    expect(screen.getByText('API Routes')).toBeInTheDocument();
    expect(screen.getByText('3 registered routes')).toBeInTheDocument();
    expect(screen.getByText('/api/auth/login')).toBeInTheDocument();
    expect(screen.getByText('/api/users/me')).toBeInTheDocument();
    expect(screen.getByText('/api/admin/users')).toBeInTheDocument();
  });

  it('should render page heading and route count', () => {
    mockUseRouteManifest.mockReturnValue({
      data: { routes: [], count: 0 },
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn().mockResolvedValue(undefined),
    });

    render(<RouteManifestPage />);
    expect(screen.getByText('API Routes')).toBeInTheDocument();
    expect(screen.getByText('0 registered routes')).toBeInTheDocument();
  });
});
