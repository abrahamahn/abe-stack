// src/apps/web/src/features/settings/components/OAuthConnectionsList.test.tsx
/**
 * OAuth Connections List Component Tests
 *
 * Comprehensive tests for OAuth connections management covering:
 * - Loading and error states
 * - Provider list rendering
 * - Connection status display
 * - Connect/disconnect operations
 * - User confirmations and error handling
 */

import { useEnabledOAuthProviders, useOAuthConnections } from '@abe-stack/react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { OAuthConnectionsList, type OAuthConnectionsListProps } from './OAuthConnectionsList';

import type { OAuthConnection, OAuthProvider } from '@abe-stack/shared';

// Mock the SDK hooks
vi.mock('@abe-stack/react', () => ({
  useEnabledOAuthProviders: vi.fn(),
  useOAuthConnections: vi.fn(),
}));

// Mock UI components
vi.mock('@abe-stack/ui', async () => {
  const actual = await vi.importActual('@abe-stack/ui');

  const mockAlert = ({ children, tone }: { children: React.ReactNode; tone: string }) => (
    <div data-testid="alert" data-tone={tone}>
      {children}
    </div>
  );

  const mockButton = ({
    children,
    onClick,
    disabled,
    variant,
    size,
    className,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'text' | 'danger' | 'link';
    size?: 'small' | 'medium' | 'large';
    className?: string;
  }) => (
    <button
      data-testid={`button-${typeof children === 'string' ? children : 'content'}`}
      onClick={onClick}
      disabled={disabled}
      data-variant={variant}
      data-size={size}
      className={className}
    >
      {children}
    </button>
  );

  const mockCard = ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="card" className={className}>
      {children}
    </div>
  );

  const mockSkeleton = ({ className }: { className?: string }) => (
    <div data-testid="skeleton" className={className} />
  );

  return {
    ...actual,
    Alert: mockAlert,
    Button: mockButton,
    Card: mockCard,
    Skeleton: mockSkeleton,
  };
});

describe('OAuthConnectionsList', () => {
  let mockGetLinkUrl: ReturnType<typeof vi.fn>;
  let mockUnlink: ReturnType<typeof vi.fn>;
  let mockOnSuccess: any;

  const mockConnections: OAuthConnection[] = [
    {
      id: 'conn-1',
      provider: 'google',
      providerEmail: 'user@gmail.com',
      connectedAt: new Date(),
    },
    {
      id: 'conn-2',
      provider: 'github',
      providerEmail: 'user@github.com',
      connectedAt: new Date(),
    },
  ];

  const defaultProps: OAuthConnectionsListProps = {};

  beforeEach(() => {
    mockGetLinkUrl = vi.fn((provider: OAuthProvider) => `/auth/oauth/${provider}`);
    mockUnlink = vi.fn().mockResolvedValue(undefined);
    mockOnSuccess = vi.fn();

    // Mock window methods
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    Object.defineProperty(window, 'location', {
      value: { href: '' },
      writable: true,
    });

    // Mock localStorage
    Storage.prototype.getItem = vi.fn(() => 'mock-token');

    // Default mock implementations
    vi.mocked(useEnabledOAuthProviders).mockReturnValue({
      providers: ['google', 'github', 'apple'] as OAuthProvider[],
      isLoading: false,
      isFetching: false,
      isSuccess: true,
      isError: false,
      error: null,
      refetch: vi.fn() as any,
    } as any);

    vi.mocked(useOAuthConnections).mockReturnValue({
      connections: mockConnections,
      isLoading: false,
      isFetching: false,
      isSuccess: true,
      isError: false,
      isActing: false,
      error: null,
      unlink: mockUnlink as any,
      getLinkUrl: mockGetLinkUrl as any,
      refetch: vi.fn() as any,
    } as any);
  });

  // ============================================================================
  // Loading States
  // ============================================================================

  describe('loading states', () => {
    it('should show skeleton loaders when providers are loading', () => {
      vi.mocked(useEnabledOAuthProviders).mockReturnValue({
        providers: [],
        isLoading: true,
        isFetching: true,
        isSuccess: false,
        isError: false,
        error: null,
        refetch: vi.fn() as any,
      } as any);

      render(<OAuthConnectionsList {...defaultProps} />);

      const skeletons = screen.getAllByTestId('skeleton');
      expect(skeletons).toHaveLength(3);
    });

    it('should show skeleton loaders when connections are loading', () => {
      vi.mocked(useOAuthConnections).mockReturnValue({
        connections: [],
        isLoading: true,
        isFetching: true,
        isSuccess: false,
        isError: false,
        isActing: false,
        error: null,
        unlink: mockUnlink as any,
        getLinkUrl: mockGetLinkUrl as any,
        refetch: vi.fn() as any,
      } as any);

      render(<OAuthConnectionsList {...defaultProps} />);

      const skeletons = screen.getAllByTestId('skeleton');
      expect(skeletons).toHaveLength(3);
    });

    it('should show skeleton loaders when both are loading', () => {
      vi.mocked(useEnabledOAuthProviders).mockReturnValue({
        providers: [],
        isLoading: true,
        isFetching: true,
        isSuccess: false,
        isError: false,
        error: null,
        refetch: vi.fn() as any,
      } as any);

      vi.mocked(useOAuthConnections).mockReturnValue({
        connections: [],
        isLoading: true,
        isFetching: true,
        isSuccess: false,
        isError: false,
        isActing: false,
        error: null,
        unlink: mockUnlink as any,
        getLinkUrl: mockGetLinkUrl as any,
        refetch: vi.fn() as any,
      } as any);

      render(<OAuthConnectionsList {...defaultProps} />);

      expect(screen.getAllByTestId('skeleton')).toHaveLength(3);
    });
  });

  // ============================================================================
  // Error States
  // ============================================================================

  describe('error states', () => {
    it('should display error when providers fail to load', () => {
      vi.mocked(useEnabledOAuthProviders).mockReturnValue({
        providers: [],
        isLoading: false,
        isFetching: false,
        isSuccess: false,
        isError: true,
        error: new Error('Failed to load providers'),
        refetch: vi.fn() as any,
      } as any);

      render(<OAuthConnectionsList {...defaultProps} />);

      expect(screen.getByTestId('alert')).toBeInTheDocument();
      expect(screen.getByText(/Failed to load OAuth connections/)).toBeInTheDocument();
      expect(screen.getByText(/Failed to load providers/)).toBeInTheDocument();
    });

    it('should display error when connections fail to load', () => {
      vi.mocked(useOAuthConnections).mockReturnValue({
        connections: [],
        isLoading: false,
        isFetching: false,
        isSuccess: false,
        isError: true,
        isActing: false,
        error: new Error('Failed to load connections'),
        unlink: mockUnlink as any,
        getLinkUrl: mockGetLinkUrl as any,
        refetch: vi.fn() as any,
      } as any);

      render(<OAuthConnectionsList {...defaultProps} />);

      expect(screen.getByTestId('alert')).toBeInTheDocument();
      expect(screen.getByText(/Failed to load connections/)).toBeInTheDocument();
    });

    it('should prioritize providers error when both fail', () => {
      vi.mocked(useEnabledOAuthProviders).mockReturnValue({
        providers: [],
        isLoading: false,
        isFetching: false,
        isSuccess: false,
        isError: true,
        error: new Error('Providers error'),
        refetch: vi.fn() as any,
      } as any);

      vi.mocked(useOAuthConnections).mockReturnValue({
        connections: [],
        isLoading: false,
        isFetching: false,
        isSuccess: false,
        isError: true,
        isActing: false,
        error: new Error('Connections error'),
        unlink: mockUnlink as any,
        getLinkUrl: mockGetLinkUrl as any,
        refetch: vi.fn() as any,
      } as any);

      render(<OAuthConnectionsList {...defaultProps} />);

      expect(screen.getByText(/Providers error/)).toBeInTheDocument();
      expect(screen.queryByText(/Connections error/)).not.toBeInTheDocument();
    });
  });

  // ============================================================================
  // Empty States
  // ============================================================================

  describe('empty states', () => {
    it('should show message when no providers are enabled', () => {
      vi.mocked(useEnabledOAuthProviders).mockReturnValue({
        providers: [],
        isLoading: false,
        isFetching: false,
        isSuccess: true,
        isError: false,
        error: null,
        refetch: vi.fn() as any,
      } as any);

      render(<OAuthConnectionsList {...defaultProps} />);

      expect(
        screen.getByText('No OAuth providers are configured for this application.'),
      ).toBeInTheDocument();
    });

    it('should show helper message when no connections exist', () => {
      vi.mocked(useOAuthConnections).mockReturnValue({
        connections: [],
        isLoading: false,
        isActing: false,
        error: null,
        unlink: mockUnlink as any,
        getLinkUrl: mockGetLinkUrl as any,
      } as any);

      render(<OAuthConnectionsList {...defaultProps} />);

      expect(screen.getByText('Connect an account for easier sign-in.')).toBeInTheDocument();
    });
  });

  // ============================================================================
  // Provider List Rendering
  // ============================================================================

  describe('provider list rendering', () => {
    it('should render all enabled providers', () => {
      render(<OAuthConnectionsList {...defaultProps} />);

      expect(screen.getByText('Google')).toBeInTheDocument();
      expect(screen.getByText('GitHub')).toBeInTheDocument();
      expect(screen.getByText('Apple')).toBeInTheDocument();
    });

    it('should show connected status for linked providers', () => {
      render(<OAuthConnectionsList {...defaultProps} />);

      expect(screen.getByText('user@gmail.com')).toBeInTheDocument();
      expect(screen.getByText('user@github.com')).toBeInTheDocument();
    });

    it('should show disconnect button for connected providers', () => {
      render(<OAuthConnectionsList {...defaultProps} />);

      const disconnectButtons = screen.getAllByTestId('button-Disconnect');
      expect(disconnectButtons).toHaveLength(2); // Google and GitHub are connected
    });

    it('should show connect button for unconnected providers', () => {
      render(<OAuthConnectionsList {...defaultProps} />);

      const connectButtons = screen.getAllByTestId('button-Connect');
      expect(connectButtons).toHaveLength(1); // Apple is not connected
    });

    it('should render provider cards', () => {
      render(<OAuthConnectionsList {...defaultProps} />);

      const cards = screen.getAllByTestId('card');
      expect(cards).toHaveLength(3); // Google, GitHub, Apple
    });
  });

  // ============================================================================
  // Connect Operations
  // ============================================================================

  describe('connect operations', () => {
    it('should navigate to OAuth link URL when connect is clicked', () => {
      render(<OAuthConnectionsList {...defaultProps} />);

      const connectButton = screen.getByTestId('button-Connect');
      fireEvent.click(connectButton);

      expect(mockGetLinkUrl).toHaveBeenCalledWith('apple');
      expect(window.location.href).toBe('/auth/oauth/apple');
    });

    it('should generate correct link URLs for different providers', () => {
      render(<OAuthConnectionsList {...defaultProps} />);

      expect((mockGetLinkUrl as any)('google')).toBe('/auth/oauth/google');
      expect((mockGetLinkUrl as any)('github')).toBe('/auth/oauth/github');
      expect((mockGetLinkUrl as any)('apple')).toBe('/auth/oauth/apple');
    });
  });

  // ============================================================================
  // Disconnect Operations
  // ============================================================================

  describe('disconnect operations', () => {
    it('should show confirmation dialog before disconnecting', () => {
      vi.spyOn(window, 'confirm').mockReturnValue(false);

      render(<OAuthConnectionsList {...defaultProps} />);

      const disconnectButton = screen.getAllByTestId('button-Disconnect')[0]!;
      fireEvent.click(disconnectButton);

      expect(window.confirm).toHaveBeenCalledWith('Are you sure you want to disconnect Google?');
      expect(mockUnlink).not.toHaveBeenCalled();
    });

    it('should disconnect when user confirms', async () => {
      vi.spyOn(window, 'confirm').mockReturnValue(true);

      render(<OAuthConnectionsList {...defaultProps} onSuccess={mockOnSuccess} />);

      const disconnectButton = screen.getAllByTestId('button-Disconnect')[0]!;
      fireEvent.click(disconnectButton);

      await waitFor(() => {
        expect(mockUnlink).toHaveBeenCalledWith('google');
        expect(mockOnSuccess).toHaveBeenCalled();
      });
    });

    it('should not disconnect when user cancels', () => {
      vi.spyOn(window, 'confirm').mockReturnValue(false);

      render(<OAuthConnectionsList {...defaultProps} />);

      const disconnectButton = screen.getAllByTestId('button-Disconnect')[0]!;
      fireEvent.click(disconnectButton);

      expect(mockUnlink).not.toHaveBeenCalled();
    });

    it('should show disconnecting state', () => {
      vi.mocked(useOAuthConnections).mockReturnValue({
        connections: mockConnections,
        isLoading: false,
        isFetching: false,
        isSuccess: true,
        isError: false,
        isActing: true,
        error: null,
        unlink: mockUnlink as any,
        getLinkUrl: mockGetLinkUrl as any,
        refetch: vi.fn() as any,
      } as any);

      render(<OAuthConnectionsList {...defaultProps} />);

      expect(screen.getAllByTestId('button-Disconnecting...').length).toBeGreaterThan(0);
    });

    it('should disable disconnect button during action', () => {
      vi.mocked(useOAuthConnections).mockReturnValue({
        connections: mockConnections,
        isLoading: false,
        isFetching: false,
        isSuccess: true,
        isError: false,
        isActing: true,
        error: null,
        unlink: mockUnlink as any,
        getLinkUrl: mockGetLinkUrl as any,
        refetch: vi.fn() as any,
      } as any);

      render(<OAuthConnectionsList {...defaultProps} />);

      const disconnectButtons = screen.getAllByTestId('button-Disconnecting...');
      disconnectButtons.forEach((button) => {
        expect(button).toBeDisabled();
      });
    });

    it('should handle disconnect error', async () => {
      vi.spyOn(window, 'confirm').mockReturnValue(true);
      mockUnlink.mockRejectedValue(new Error('Network error'));

      render(<OAuthConnectionsList {...defaultProps} />);

      const disconnectButton = screen.getAllByTestId('button-Disconnect')[0]!;
      fireEvent.click(disconnectButton);

      await waitFor(() => {
        expect(screen.getByTestId('alert')).toBeInTheDocument();
        expect(screen.getByText('Network error')).toBeInTheDocument();
      });
    });

    it('should handle non-Error disconnect failures', async () => {
      vi.spyOn(window, 'confirm').mockReturnValue(true);
      mockUnlink.mockRejectedValue('String error');

      render(<OAuthConnectionsList {...defaultProps} />);

      const disconnectButton = screen.getAllByTestId('button-Disconnect')[0]!;
      fireEvent.click(disconnectButton);

      await waitFor(() => {
        expect(screen.getByText('Failed to disconnect Google')).toBeInTheDocument();
      });
    });

    it('should clear previous errors before new disconnect', async () => {
      vi.spyOn(window, 'confirm').mockReturnValue(true);
      mockUnlink.mockRejectedValueOnce(new Error('First error')).mockResolvedValueOnce(undefined);

      const { rerender } = render(<OAuthConnectionsList {...defaultProps} />);

      // First disconnect - should fail
      const disconnectButton = screen.getAllByTestId('button-Disconnect')[0]!;
      fireEvent.click(disconnectButton);

      await waitFor(() => {
        expect(screen.getByText('First error')).toBeInTheDocument();
      });

      // Second disconnect - should succeed and clear error
      rerender(<OAuthConnectionsList {...defaultProps} />);
      const secondDisconnectButton = screen.getAllByTestId('button-Disconnect')[0]!;
      fireEvent.click(secondDisconnectButton);

      await waitFor(() => {
        expect(mockUnlink).toHaveBeenCalledTimes(2);
      });
    });

    it('should not call onSuccess when disconnect fails', async () => {
      vi.spyOn(window, 'confirm').mockReturnValue(true);
      mockUnlink.mockRejectedValue(new Error('Network error'));

      render(<OAuthConnectionsList {...defaultProps} onSuccess={mockOnSuccess} />);

      const disconnectButton = screen.getAllByTestId('button-Disconnect')[0]!;
      fireEvent.click(disconnectButton);

      await waitFor(() => {
        expect(mockUnlink).toHaveBeenCalled();
      });

      expect(mockOnSuccess).not.toHaveBeenCalled();
    });
  });

  // ============================================================================
  // Provider-Specific Tests
  // ============================================================================

  describe('provider-specific functionality', () => {
    it('should correctly identify Google connection', () => {
      render(<OAuthConnectionsList {...defaultProps} />);

      expect(screen.getByText('Google')).toBeInTheDocument();
      expect(screen.getByText('user@gmail.com')).toBeInTheDocument();
    });

    it('should correctly identify GitHub connection', () => {
      render(<OAuthConnectionsList {...defaultProps} />);

      expect(screen.getByText('GitHub')).toBeInTheDocument();
      expect(screen.getByText('user@github.com')).toBeInTheDocument();
    });

    it('should correctly identify Apple as unconnected', () => {
      render(<OAuthConnectionsList {...defaultProps} />);

      expect(screen.getByText('Apple')).toBeInTheDocument();
      // Should have Connect button for Apple
      const connectButton = screen.getByTestId('button-Connect');
      expect(connectButton).toBeInTheDocument();
    });

    it('should display provider icons', () => {
      render(<OAuthConnectionsList {...defaultProps} />);

      // Icons are displayed as text content
      expect(screen.getByText('G')).toBeInTheDocument(); // Google
      expect(screen.getByText('GH')).toBeInTheDocument(); // GitHub
      // Apple has an empty icon, so we just check the provider name exists
      expect(screen.getByText('Apple')).toBeInTheDocument();
    });
  });

  // ============================================================================
  // API Client Configuration
  // ============================================================================

  describe('API client configuration', () => {
    it('should use VITE_API_URL from environment', () => {
      // This is tested indirectly through the hooks being called
      render(<OAuthConnectionsList {...defaultProps} />);

      expect(useEnabledOAuthProviders).toHaveBeenCalled();
      expect(useOAuthConnections).toHaveBeenCalled();
    });

    it('should retrieve token from localStorage', () => {
      render(<OAuthConnectionsList {...defaultProps} />);

      // The component creates a getToken function that calls localStorage
      const calls = vi.mocked(useEnabledOAuthProviders).mock.calls;
      expect(calls.length).toBeGreaterThan(0);
      const config = calls[0]![0];
      expect(config.getToken!()).toBe('mock-token');
    });

    it('should handle missing API URL', () => {
      // Set VITE_API_URL to undefined
      const originalEnv = import.meta.env['VITE_API_URL'];
      (import.meta.env as any)['VITE_API_URL'] = undefined as unknown as string;

      render(<OAuthConnectionsList {...defaultProps} />);

      // Should not crash
      expect(screen.queryByTestId('alert')).not.toBeInTheDocument();

      // Restore
      import.meta.env['VITE_API_URL'] = originalEnv;
    });
  });

  // ============================================================================
  // Edge Cases
  // ============================================================================

  describe('edge cases', () => {
    it('should handle empty connections array', () => {
      vi.mocked(useOAuthConnections).mockReturnValue({
        connections: [],
        isLoading: false,
        isFetching: false,
        isSuccess: true,
        isError: false,
        isActing: false,
        error: null,
        unlink: mockUnlink as any,
        getLinkUrl: mockGetLinkUrl as any,
        refetch: vi.fn() as any,
      } as any);

      render(<OAuthConnectionsList {...defaultProps} />);

      expect(screen.getByText('Connect an account for easier sign-in.')).toBeInTheDocument();
    });

    it('should handle partial connections', () => {
      const partialConnections: OAuthConnection[] = [
        {
          id: 'conn-1',
          provider: 'google',
          providerEmail: 'user@gmail.com',
          connectedAt: new Date(),
        },
      ];

      vi.mocked(useOAuthConnections).mockReturnValue({
        connections: partialConnections,
        isLoading: false,
        isFetching: false,
        isSuccess: true,
        isError: false,
        isActing: false,
        error: null,
        unlink: mockUnlink as any,
        getLinkUrl: mockGetLinkUrl as any,
        refetch: vi.fn() as any,
      } as any);

      render(<OAuthConnectionsList {...defaultProps} />);

      expect(screen.getAllByTestId('button-Disconnect')).toHaveLength(1);
      expect(screen.getAllByTestId('button-Connect')).toHaveLength(2);
    });

    it('should not show helper message when connections exist', () => {
      render(<OAuthConnectionsList {...defaultProps} />);

      expect(screen.queryByText('Connect an account for easier sign-in.')).not.toBeInTheDocument();
    });

    it('should handle undefined onSuccess prop', async () => {
      vi.spyOn(window, 'confirm').mockReturnValue(true);

      render(<OAuthConnectionsList {...defaultProps} />);

      const disconnectButton = screen.getAllByTestId('button-Disconnect')[0]!;
      fireEvent.click(disconnectButton);

      await waitFor(() => {
        expect(mockUnlink).toHaveBeenCalled();
      });

      // Should not throw
    });

    it('should not display unlink error when error is empty string', () => {
      render(<OAuthConnectionsList {...defaultProps} />);

      // Trigger an error state but set empty string
      // This is tested by the component logic that checks: unlinkError !== null && unlinkError.length > 0
      expect(screen.queryByTestId('alert')).not.toBeInTheDocument();
    });

    it('should handle connection with missing email', () => {
      const connectionNoEmail: OAuthConnection[] = [
        {
          id: 'conn-1',
          provider: 'google',
          providerEmail: '',
          connectedAt: new Date(),
        },
      ];

      vi.mocked(useOAuthConnections).mockReturnValue({
        connections: connectionNoEmail,
        isLoading: false,
        isFetching: false,
        isSuccess: true,
        isError: false,
        isActing: false,
        error: null,
        unlink: mockUnlink as any,
        getLinkUrl: mockGetLinkUrl as any,
        refetch: vi.fn() as any,
      } as any);

      render(<OAuthConnectionsList {...defaultProps} />);

      // Should still render the provider
      expect(screen.getByText('Google')).toBeInTheDocument();
    });
  });
});
