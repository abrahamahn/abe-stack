// src/apps/web/src/features/settings/components/SessionCard.test.tsx
/**
 * Session Card Component Tests
 *
 * Comprehensive tests for session card component covering:
 * - Component rendering with session data
 * - User agent parsing (browser and OS detection)
 * - Date formatting (relative time display)
 * - Current session badge display
 * - Revoke button functionality
 * - Loading/revoking states
 */

import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { SessionCard } from './SessionCard';

import type { Session } from '../api';
import type { SessionCardProps } from './SessionCard';
import type { ReactNode } from 'react';

// Mock UI components
vi.mock('@abe-stack/ui', async () => {
  const actual = await vi.importActual('@abe-stack/ui');

  const mockBadge = ({ children, tone }: { children: ReactNode; tone: string }) => (
    <div data-testid="badge" data-tone={tone}>
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
    children: ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    variant?: string;
    size?: string;
    className?: string;
  }) => (
    <button
      data-testid="revoke-button"
      onClick={onClick}
      disabled={disabled}
      data-variant={variant}
      data-size={size}
      className={className}
    >
      {children}
    </button>
  );

  const mockCard = ({ children, className }: { children: ReactNode; className?: string }) => (
    <div data-testid="session-card" className={className}>
      {children}
    </div>
  );

  return {
    ...actual,
    Badge: mockBadge,
    Button: mockButton,
    Card: mockCard,
  };
});

describe('SessionCard', () => {
  let mockOnRevoke: ReturnType<typeof vi.fn>;

  const baseSession: Session = {
    id: 'session-123',
    device: 'Chrome on Windows',
    ipAddress: '192.168.1.1',
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    createdAt: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
    expiresAt: new Date(Date.now() + 3600000).toISOString(),
    lastUsedAt: new Date().toISOString(),
    isCurrent: false,
  };

  const defaultProps: SessionCardProps = {
    session: baseSession,
    onRevoke: vi.fn(),
    isRevoking: false,
  };

  beforeEach(() => {
    mockOnRevoke = vi.fn();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-15T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ============================================================================
  // Rendering
  // ============================================================================

  describe('rendering', () => {
    it('should render session card', () => {
      render(<SessionCard {...defaultProps} />);

      expect(screen.getByTestId('session-card')).toBeInTheDocument();
    });

    it('should render browser and OS information', () => {
      render(<SessionCard {...defaultProps} />);

      expect(screen.getByText('Chrome on Windows')).toBeInTheDocument();
    });

    it('should render IP address when present', () => {
      render(<SessionCard {...defaultProps} />);

      expect(screen.getByText('IP: 192.168.1.1')).toBeInTheDocument();
    });

    it('should render creation date', () => {
      const session: Session = {
        ...baseSession,
        createdAt: new Date('2024-01-15T11:00:00Z').toISOString(), // 1 hour ago
      };

      render(<SessionCard {...defaultProps} session={session} />);

      expect(screen.getByText(/Started:/)).toBeInTheDocument();
    });

    it('should render revoke button for non-current sessions', () => {
      render(<SessionCard {...defaultProps} />);

      expect(screen.getByTestId('revoke-button')).toBeInTheDocument();
      expect(screen.getByText('Revoke')).toBeInTheDocument();
    });

    it('should not render revoke button for current session', () => {
      const currentSession: Session = {
        ...baseSession,
        isCurrent: true,
      };

      render(<SessionCard {...defaultProps} session={currentSession} />);

      expect(screen.queryByTestId('revoke-button')).not.toBeInTheDocument();
    });

    it('should render current session badge', () => {
      const currentSession: Session = {
        ...baseSession,
        isCurrent: true,
      };

      render(<SessionCard {...defaultProps} session={currentSession} />);

      expect(screen.getByTestId('badge')).toBeInTheDocument();
      expect(screen.getByText('Current Session')).toBeInTheDocument();
    });

    it('should not render current session badge for non-current sessions', () => {
      render(<SessionCard {...defaultProps} />);

      expect(screen.queryByTestId('badge')).not.toBeInTheDocument();
    });

    it('should not render IP address when null', () => {
      const session: Session = {
        ...baseSession,
        ipAddress: null,
      };

      render(<SessionCard {...defaultProps} session={session} />);

      expect(screen.queryByText(/IP:/)).not.toBeInTheDocument();
    });

    it('should not render IP address when empty string', () => {
      const session: Session = {
        ...baseSession,
        ipAddress: '',
      };

      render(<SessionCard {...defaultProps} session={session} />);

      expect(screen.queryByText(/IP:/)).not.toBeInTheDocument();
    });
  });

  // ============================================================================
  // User Agent Parsing - Browser Detection
  // ============================================================================

  describe('user agent parsing - browser detection', () => {
    it('should detect Chrome', () => {
      const session: Session = {
        ...baseSession,
        userAgent:
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      };

      render(<SessionCard {...defaultProps} session={session} />);

      expect(screen.getByText(/Chrome/)).toBeInTheDocument();
    });

    it('should detect Firefox', () => {
      const session: Session = {
        ...baseSession,
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:89.0) Gecko/20100101 Firefox/89.0',
      };

      render(<SessionCard {...defaultProps} session={session} />);

      expect(screen.getByText(/Firefox/)).toBeInTheDocument();
    });

    it('should detect Safari', () => {
      const session: Session = {
        ...baseSession,
        userAgent:
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Safari/605.1.15',
      };

      render(<SessionCard {...defaultProps} session={session} />);

      expect(screen.getByText(/Safari/)).toBeInTheDocument();
    });

    it('should detect Edge', () => {
      const session: Session = {
        ...baseSession,
        userAgent:
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36 Edg/91.0.864.59',
      };

      render(<SessionCard {...defaultProps} session={session} />);

      expect(screen.getByText(/Edge/)).toBeInTheDocument();
    });

    it('should detect Opera', () => {
      const session: Session = {
        ...baseSession,
        userAgent:
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36 OPR/77.0.4054.203',
      };

      render(<SessionCard {...defaultProps} session={session} />);

      expect(screen.getByText(/Opera/)).toBeInTheDocument();
    });

    it('should show "Unknown browser" for unrecognized user agent', () => {
      const session: Session = {
        ...baseSession,
        userAgent: 'Unknown/1.0',
      };

      render(<SessionCard {...defaultProps} session={session} />);

      expect(screen.getByText(/Unknown browser/)).toBeInTheDocument();
    });

    it('should show "Unknown browser" for null user agent', () => {
      const session: Session = {
        ...baseSession,
        userAgent: null,
      };

      render(<SessionCard {...defaultProps} session={session} />);

      expect(screen.getByText(/Unknown browser/)).toBeInTheDocument();
    });
  });

  // ============================================================================
  // User Agent Parsing - OS Detection
  // ============================================================================

  describe('user agent parsing - OS detection', () => {
    it('should detect Windows', () => {
      const session: Session = {
        ...baseSession,
        userAgent:
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      };

      render(<SessionCard {...defaultProps} session={session} />);

      expect(screen.getByText(/Windows/)).toBeInTheDocument();
    });

    it('should detect macOS', () => {
      const session: Session = {
        ...baseSession,
        userAgent:
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      };

      render(<SessionCard {...defaultProps} session={session} />);

      expect(screen.getByText(/macOS/)).toBeInTheDocument();
    });

    it('should detect Linux', () => {
      const session: Session = {
        ...baseSession,
        userAgent:
          'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      };

      render(<SessionCard {...defaultProps} session={session} />);

      expect(screen.getByText(/Linux/)).toBeInTheDocument();
    });

    it('should detect Android', () => {
      const session: Session = {
        ...baseSession,
        userAgent:
          'Mozilla/5.0 (Linux; Android 11; Pixel 5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.120 Mobile Safari/537.36',
      };

      render(<SessionCard {...defaultProps} session={session} />);

      expect(screen.getByText(/Android/)).toBeInTheDocument();
    });

    it('should detect iOS from iPhone', () => {
      const session: Session = {
        ...baseSession,
        userAgent:
          'Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Mobile/15E148 Safari/604.1',
      };

      render(<SessionCard {...defaultProps} session={session} />);

      expect(screen.getByText(/iOS/)).toBeInTheDocument();
    });

    it('should detect iOS from iPad', () => {
      const session: Session = {
        ...baseSession,
        userAgent:
          'Mozilla/5.0 (iPad; CPU OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1',
      };

      render(<SessionCard {...defaultProps} session={session} />);

      expect(screen.getByText(/iOS/)).toBeInTheDocument();
    });

    it('should show "Unknown device" for unrecognized OS', () => {
      const session: Session = {
        ...baseSession,
        userAgent: 'Unknown OS',
      };

      render(<SessionCard {...defaultProps} session={session} />);

      expect(screen.getByText(/Unknown device/)).toBeInTheDocument();
    });

    it('should show "Unknown device" for null user agent', () => {
      const session: Session = {
        ...baseSession,
        userAgent: null,
      };

      render(<SessionCard {...defaultProps} session={session} />);

      expect(screen.getByText(/Unknown device/)).toBeInTheDocument();
    });
  });

  // ============================================================================
  // Date Formatting
  // ============================================================================

  describe('date formatting', () => {
    it('should show "Just now" for dates within the current minute', () => {
      const session: Session = {
        ...baseSession,
        createdAt: new Date('2024-01-15T11:59:30Z').toISOString(), // 30 seconds ago
      };

      render(<SessionCard {...defaultProps} session={session} />);

      expect(screen.getByText(/Just now/)).toBeInTheDocument();
    });

    it('should show minutes ago for dates within the hour', () => {
      const session: Session = {
        ...baseSession,
        createdAt: new Date('2024-01-15T11:45:00Z').toISOString(), // 15 minutes ago
      };

      render(<SessionCard {...defaultProps} session={session} />);

      expect(screen.getByText(/15 minutes ago/)).toBeInTheDocument();
    });

    it('should show singular "minute" for 1 minute ago', () => {
      const session: Session = {
        ...baseSession,
        createdAt: new Date('2024-01-15T11:59:00Z').toISOString(), // 1 minute ago
      };

      render(<SessionCard {...defaultProps} session={session} />);

      expect(screen.getByText(/1 minute ago/)).toBeInTheDocument();
    });

    it('should show hours ago for dates within the day', () => {
      const session: Session = {
        ...baseSession,
        createdAt: new Date('2024-01-15T09:00:00Z').toISOString(), // 3 hours ago
      };

      render(<SessionCard {...defaultProps} session={session} />);

      expect(screen.getByText(/3 hours ago/)).toBeInTheDocument();
    });

    it('should show singular "hour" for 1 hour ago', () => {
      const session: Session = {
        ...baseSession,
        createdAt: new Date('2024-01-15T11:00:00Z').toISOString(), // 1 hour ago
      };

      render(<SessionCard {...defaultProps} session={session} />);

      expect(screen.getByText(/1 hour ago/)).toBeInTheDocument();
    });

    it('should show "Yesterday" for dates from yesterday', () => {
      const session: Session = {
        ...baseSession,
        createdAt: new Date('2024-01-14T12:00:00Z').toISOString(), // 1 day ago
      };

      render(<SessionCard {...defaultProps} session={session} />);

      expect(screen.getByText(/Yesterday/)).toBeInTheDocument();
    });

    it('should show days ago for dates within the week', () => {
      const session: Session = {
        ...baseSession,
        createdAt: new Date('2024-01-10T12:00:00Z').toISOString(), // 5 days ago
      };

      render(<SessionCard {...defaultProps} session={session} />);

      expect(screen.getByText(/5 days ago/)).toBeInTheDocument();
    });

    it('should show full date for dates older than a week', () => {
      const session: Session = {
        ...baseSession,
        createdAt: new Date('2024-01-01T12:00:00Z').toISOString(), // 14 days ago
      };

      render(<SessionCard {...defaultProps} session={session} />);

      // Should show formatted date like "1/1/2024"
      expect(screen.getByText(/Started:/)).toBeInTheDocument();
    });
  });

  // ============================================================================
  // Revoke Functionality
  // ============================================================================

  describe('revoke functionality', () => {
    it('should call onRevoke when revoke button is clicked', () => {
      render(<SessionCard {...defaultProps} onRevoke={mockOnRevoke as any} />);

      const revokeButton = screen.getByTestId('revoke-button');
      fireEvent.click(revokeButton);

      expect(mockOnRevoke).toHaveBeenCalledTimes(1);
    });

    it('should show revoking state', () => {
      render(<SessionCard {...defaultProps} isRevoking={true} />);

      expect(screen.getByText('Revoking...')).toBeInTheDocument();
    });

    it('should disable revoke button when revoking', () => {
      render(<SessionCard {...defaultProps} isRevoking={true} />);

      const revokeButton = screen.getByTestId('revoke-button');
      expect(revokeButton).toBeDisabled();
    });

    it('should not disable revoke button when not revoking', () => {
      render(<SessionCard {...defaultProps} isRevoking={false} />);

      const revokeButton = screen.getByTestId('revoke-button');
      expect(revokeButton).not.toBeDisabled();
    });

    it('should have default isRevoking as false', () => {
      const { onRevoke, session } = defaultProps;
      render(<SessionCard session={session} onRevoke={onRevoke} />);

      const revokeButton = screen.getByTestId('revoke-button');
      expect(revokeButton).not.toBeDisabled();
      expect(screen.getByText('Revoke')).toBeInTheDocument();
    });
  });

  // ============================================================================
  // Edge Cases
  // ============================================================================

  describe('edge cases', () => {
    it('should handle empty user agent string', () => {
      const session: Session = {
        ...baseSession,
        userAgent: '',
      };

      render(<SessionCard {...defaultProps} session={session} />);

      expect(screen.getByText(/Unknown browser/)).toBeInTheDocument();
      expect(screen.getByText(/Unknown device/)).toBeInTheDocument();
    });

    it('should handle complex user agent with multiple keywords', () => {
      const session: Session = {
        ...baseSession,
        userAgent:
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36 Edg/91.0.864.59',
      };

      render(<SessionCard {...defaultProps} session={session} />);

      // Edge should take precedence over Chrome
      expect(screen.getByText(/Edge/)).toBeInTheDocument();
    });

    it('should handle mobile Safari correctly', () => {
      const session: Session = {
        ...baseSession,
        userAgent:
          'Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Mobile/15E148 Safari/604.1',
      };

      render(<SessionCard {...defaultProps} session={session} />);

      expect(screen.getByText(/Safari/)).toBeInTheDocument();
      expect(screen.getByText(/iOS/)).toBeInTheDocument();
    });

    it('should handle very old dates', () => {
      const session: Session = {
        ...baseSession,
        createdAt: new Date('2020-01-01T12:00:00Z').toISOString(), // Years ago
      };

      render(<SessionCard {...defaultProps} session={session} />);

      // Should show formatted date
      expect(screen.getByText(/Started:/)).toBeInTheDocument();
    });

    it('should handle zero time difference', () => {
      const session: Session = {
        ...baseSession,
        createdAt: new Date('2024-01-15T12:00:00Z').toISOString(), // Exactly now
      };

      render(<SessionCard {...defaultProps} session={session} />);

      expect(screen.getByText(/Just now/)).toBeInTheDocument();
    });

    it('should handle IP address with special characters', () => {
      const session: Session = {
        ...baseSession,
        ipAddress: '::1', // IPv6 loopback
      };

      render(<SessionCard {...defaultProps} session={session} />);

      expect(screen.getByText('IP: ::1')).toBeInTheDocument();
    });

    it('should render card with correct styling class', () => {
      render(<SessionCard {...defaultProps} />);

      const card = screen.getByTestId('session-card');
      expect(card).toHaveClass('p-4');
    });

    it('should render revoke button with correct styling', () => {
      render(<SessionCard {...defaultProps} />);

      const revokeButton = screen.getByTestId('revoke-button');
      expect(revokeButton).toHaveAttribute('data-variant', 'text');
      expect(revokeButton).toHaveAttribute('data-size', 'small');
    });

    it('should render badge with correct tone for current session', () => {
      const currentSession: Session = {
        ...baseSession,
        isCurrent: true,
      };

      render(<SessionCard {...defaultProps} session={currentSession} />);

      const badge = screen.getByTestId('badge');
      expect(badge).toHaveAttribute('data-tone', 'success');
    });
  });
});
