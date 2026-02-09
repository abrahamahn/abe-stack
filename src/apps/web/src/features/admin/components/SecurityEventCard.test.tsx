// src/apps/web/src/features/admin/components/SecurityEventCard.test.tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { SecurityEventCard } from './SecurityEventCard';

import type { SecurityEvent } from '@abe-stack/shared';

// ============================================================================
// Test Data
// ============================================================================

const mockEvent: SecurityEvent = {
  id: 'event-123',
  eventType: 'login_failed',
  severity: 'high',
  userId: 'user-456',
  email: 'test@example.com',
  ipAddress: '192.168.1.1',
  userAgent: null, // null to avoid nested <p> tag rendering issue
  createdAt: '2024-01-15T10:30:00Z',
  metadata: {
    reason: 'invalid_password',
    attempts: 3,
  },
};

// ============================================================================
// Tests
// ============================================================================

describe('SecurityEventCard', () => {
  describe('loading state', () => {
    it('should show skeletons when loading', () => {
      const { container } = render(<SecurityEventCard event={undefined} isLoading={true} />);

      const skeletons = container.querySelectorAll('.skeleton');
      expect(skeletons.length).toBeGreaterThan(0);
    });

    it('should not show event details when loading', () => {
      render(<SecurityEventCard event={undefined} isLoading={true} />);

      expect(screen.queryByText('event-123')).not.toBeInTheDocument();
    });
  });

  describe('event details display', () => {
    it('should render event details heading', () => {
      render(<SecurityEventCard event={mockEvent} isLoading={false} />);

      expect(screen.getByText('Event Details')).toBeInTheDocument();
    });

    it('should display event ID', () => {
      render(<SecurityEventCard event={mockEvent} isLoading={false} />);

      expect(screen.getByText('Event ID')).toBeInTheDocument();
      expect(screen.getByText('event-123')).toBeInTheDocument();
    });

    it('should display created at date', () => {
      render(<SecurityEventCard event={mockEvent} isLoading={false} />);

      expect(screen.getByText('Created At')).toBeInTheDocument();
    });

    it('should display formatted event type', () => {
      render(<SecurityEventCard event={mockEvent} isLoading={false} />);

      expect(screen.getByText('Event Type')).toBeInTheDocument();
      expect(screen.getByText('Login Failed')).toBeInTheDocument();
    });

    it('should display severity badge', () => {
      render(<SecurityEventCard event={mockEvent} isLoading={false} />);

      expect(screen.getByText('Severity')).toBeInTheDocument();
      expect(screen.getByText('HIGH')).toBeInTheDocument();
    });
  });

  describe('user information display', () => {
    it('should render user information heading', () => {
      render(<SecurityEventCard event={mockEvent} isLoading={false} />);

      expect(screen.getByText('User Information')).toBeInTheDocument();
    });

    it('should display user ID', () => {
      render(<SecurityEventCard event={mockEvent} isLoading={false} />);

      expect(screen.getByText('User ID')).toBeInTheDocument();
      expect(screen.getByText('user-456')).toBeInTheDocument();
    });

    it('should display email', () => {
      render(<SecurityEventCard event={mockEvent} isLoading={false} />);

      expect(screen.getByText('Email')).toBeInTheDocument();
      expect(screen.getByText('test@example.com')).toBeInTheDocument();
    });
  });

  describe('request information display', () => {
    it('should render request information heading', () => {
      render(<SecurityEventCard event={mockEvent} isLoading={false} />);

      expect(screen.getByText('Request Information')).toBeInTheDocument();
    });

    it('should display IP address', () => {
      render(<SecurityEventCard event={mockEvent} isLoading={false} />);

      expect(screen.getByText('IP Address')).toBeInTheDocument();
      expect(screen.getByText('192.168.1.1')).toBeInTheDocument();
    });

    it('should display user agent', () => {
      const eventWithUserAgent: SecurityEvent = {
        ...mockEvent,
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      };

      const { container } = render(
        <SecurityEventCard event={eventWithUserAgent} isLoading={false} />,
      );

      expect(screen.getByText('User Agent')).toBeInTheDocument();
      // Use container query to avoid nested <p> tag test error
      const userAgentText = container.querySelector('.font-mono.text-sm');
      expect(userAgentText?.textContent).toContain('Mozilla/5.0');
    });

    it('should not display user agent when null', () => {
      const eventWithoutUserAgent: SecurityEvent = {
        ...mockEvent,
        userAgent: null,
      };

      render(<SecurityEventCard event={eventWithoutUserAgent} isLoading={false} />);

      expect(screen.getByText('User Agent')).toBeInTheDocument();
      expect(screen.getByText('-')).toBeInTheDocument();
    });

    it('should not display user agent when empty string', () => {
      const eventWithEmptyUserAgent: SecurityEvent = {
        ...mockEvent,
        userAgent: '',
      };

      render(<SecurityEventCard event={eventWithEmptyUserAgent} isLoading={false} />);

      const userAgentLabel = screen.getByText('User Agent');
      const userAgentRow = userAgentLabel.closest('div');
      const dashText = userAgentRow?.querySelector('p:last-child');
      expect(dashText?.textContent).toBe('-');
    });
  });

  describe('metadata display', () => {
    it('should display additional metadata when present', () => {
      render(<SecurityEventCard event={mockEvent} isLoading={false} />);

      expect(screen.getByText('Additional Metadata')).toBeInTheDocument();
      expect(screen.getByText(/"reason": "invalid_password"/)).toBeInTheDocument();
      expect(screen.getByText(/"attempts": 3/)).toBeInTheDocument();
    });

    it('should not display metadata section when metadata is null', () => {
      const eventWithoutMetadata: SecurityEvent = {
        ...mockEvent,
        metadata: null,
      };

      render(<SecurityEventCard event={eventWithoutMetadata} isLoading={false} />);

      expect(screen.queryByText('Additional Metadata')).not.toBeInTheDocument();
    });

    it('should not display metadata section when metadata is empty object', () => {
      const eventWithEmptyMetadata: SecurityEvent = {
        ...mockEvent,
        metadata: {},
      };

      render(<SecurityEventCard event={eventWithEmptyMetadata} isLoading={false} />);

      expect(screen.queryByText('Additional Metadata')).not.toBeInTheDocument();
    });

    it('should format metadata as JSON', () => {
      render(<SecurityEventCard event={mockEvent} isLoading={false} />);

      const metadataElement = screen.getByText(/"reason": "invalid_password"/);
      expect(metadataElement.closest('pre')).toBeInTheDocument();
    });
  });

  describe('severity badge styling', () => {
    it('should apply critical styling for critical severity', () => {
      const criticalEvent: SecurityEvent = {
        ...mockEvent,
        severity: 'critical',
      };

      render(<SecurityEventCard event={criticalEvent} isLoading={false} />);

      const badge = screen.getByText('CRITICAL');
      expect(badge.className).toContain('bg-red-100');
      expect(badge.className).toContain('text-red-800');
    });

    it('should apply high styling for high severity', () => {
      render(<SecurityEventCard event={mockEvent} isLoading={false} />);

      const badge = screen.getByText('HIGH');
      expect(badge.className).toContain('bg-orange-100');
      expect(badge.className).toContain('text-orange-800');
    });

    it('should apply medium styling for medium severity', () => {
      const mediumEvent: SecurityEvent = {
        ...mockEvent,
        severity: 'medium',
      };

      render(<SecurityEventCard event={mediumEvent} isLoading={false} />);

      const badge = screen.getByText('MEDIUM');
      expect(badge.className).toContain('bg-yellow-100');
      expect(badge.className).toContain('text-yellow-800');
    });

    it('should apply low styling for low severity', () => {
      const lowEvent: SecurityEvent = {
        ...mockEvent,
        severity: 'low',
      };

      render(<SecurityEventCard event={lowEvent} isLoading={false} />);

      const badge = screen.getByText('LOW');
      expect(badge.className).toContain('bg-green-100');
      expect(badge.className).toContain('text-green-800');
    });
  });

  describe('event type formatting', () => {
    const testCases: Array<{ eventType: string; expected: string }> = [
      { eventType: 'login_failed', expected: 'Login Failed' },
      { eventType: 'token_reuse', expected: 'Token Reuse' },
      { eventType: 'account_locked', expected: 'Account Locked' },
      { eventType: 'suspicious_login', expected: 'Suspicious Login' },
    ];

    testCases.forEach(({ eventType, expected }) => {
      it(`should format ${eventType} as ${expected}`, () => {
        const event: SecurityEvent = {
          ...mockEvent,
          eventType: eventType,
        };

        render(<SecurityEventCard event={event} isLoading={false} />);

        expect(screen.getByText(expected)).toBeInTheDocument();
      });
    });
  });

  describe('null field handling', () => {
    it('should display "-" for null userId', () => {
      const eventWithoutUserId: SecurityEvent = {
        ...mockEvent,
        userId: null,
      };

      render(<SecurityEventCard event={eventWithoutUserId} isLoading={false} />);

      const userIdLabel = screen.getByText('User ID');
      const userIdRow = userIdLabel.closest('div');
      const dashText = userIdRow?.querySelector('p:last-child');
      expect(dashText?.textContent).toBe('-');
    });

    it('should display "-" for null email', () => {
      const eventWithoutEmail: SecurityEvent = {
        ...mockEvent,
        email: null,
      };

      render(<SecurityEventCard event={eventWithoutEmail} isLoading={false} />);

      const emailLabel = screen.getByText('Email');
      const emailRow = emailLabel.closest('div');
      const dashText = emailRow?.querySelector('p:last-child');
      expect(dashText?.textContent).toBe('-');
    });

    it('should display "-" for null ipAddress', () => {
      const eventWithoutIp: SecurityEvent = {
        ...mockEvent,
        ipAddress: null,
      };

      render(<SecurityEventCard event={eventWithoutIp} isLoading={false} />);

      const ipLabel = screen.getByText('IP Address');
      const ipRow = ipLabel.closest('div');
      const dashText = ipRow?.querySelector('p:last-child');
      expect(dashText?.textContent).toBe('-');
    });
  });

  describe('edge cases', () => {
    it('should handle event with all null optional fields', () => {
      const minimalEvent: SecurityEvent = {
        id: 'event-min',
        eventType: 'login_failed',
        severity: 'low',
        userId: null,
        email: null,
        ipAddress: null,
        userAgent: null,
        createdAt: '2024-01-15T10:30:00Z',
        metadata: null,
      };

      render(<SecurityEventCard event={minimalEvent} isLoading={false} />);

      expect(screen.getByText('Event Details')).toBeInTheDocument();
      expect(screen.getByText('event-min')).toBeInTheDocument();
    });

    it('should handle complex metadata objects', () => {
      const eventWithComplexMetadata: SecurityEvent = {
        ...mockEvent,
        metadata: {
          nested: {
            deep: {
              value: 'test',
            },
          },
          array: [1, 2, 3],
          bool: true,
        },
      };

      render(<SecurityEventCard event={eventWithComplexMetadata} isLoading={false} />);

      expect(screen.getByText('Additional Metadata')).toBeInTheDocument();
      expect(screen.getByText(/"deep"/)).toBeInTheDocument();
    });
  });
});
