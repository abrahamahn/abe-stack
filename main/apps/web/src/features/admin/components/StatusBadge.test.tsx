// main/apps/web/src/features/admin/components/StatusBadge.test.tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { getUserStatus, StatusBadge } from './StatusBadge';

import type { AdminUser, UserStatus } from '@abe-stack/shared';

describe('StatusBadge', () => {
  describe('rendering', () => {
    it('should render active status with correct styling', () => {
      render(<StatusBadge status="active" />);

      const badge = screen.getByText('Active');
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveAttribute('data-tone', 'success');
    });

    it('should render locked status with correct styling', () => {
      render(<StatusBadge status="locked" />);

      const badge = screen.getByText('Locked');
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveAttribute('data-tone', 'danger');
    });

    it('should render unverified status with correct styling', () => {
      render(<StatusBadge status="unverified" />);

      const badge = screen.getByText('Unverified');
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveAttribute('data-tone', 'warning');
    });
  });

  describe('status label formatting', () => {
    const statuses: UserStatus[] = ['active', 'locked', 'unverified'];

    it.each(statuses)('should capitalize %s status label', (status) => {
      render(<StatusBadge status={status} />);

      const expectedLabel = status.charAt(0).toUpperCase() + status.slice(1);
      expect(screen.getByText(expectedLabel)).toBeInTheDocument();
    });
  });
});

describe('getUserStatus', () => {
  const baseUser: AdminUser = {
    id: 'user-123',
    email: 'test@example.com',
    username: 'testuser',
    firstName: 'Test',
    lastName: 'User',
    role: 'user',
    emailVerified: true,
    emailVerifiedAt: '2024-01-01T00:00:00Z',
    failedLoginAttempts: 0,
    lockedUntil: null,
    lockReason: null,
    phone: null,
    phoneVerified: false,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  };

  describe('when user is locked', () => {
    it('should return locked when lockedUntil is in the future', () => {
      const futureDate = new Date(Date.now() + 3600000).toISOString(); // 1 hour from now
      const user: AdminUser = {
        ...baseUser,
        lockedUntil: futureDate,
      };

      expect(getUserStatus(user)).toBe('locked');
    });

    it('should not return locked when lockedUntil is in the past', () => {
      const pastDate = new Date(Date.now() - 3600000).toISOString(); // 1 hour ago
      const user: AdminUser = {
        ...baseUser,
        lockedUntil: pastDate,
      };

      expect(getUserStatus(user)).not.toBe('locked');
    });

    it('should not return locked when lockedUntil is null', () => {
      const user: AdminUser = {
        ...baseUser,
        lockedUntil: null,
      };

      expect(getUserStatus(user)).not.toBe('locked');
    });

    it('should not return locked when lockedUntil is empty string', () => {
      const user: AdminUser = {
        ...baseUser,
        lockedUntil: '',
      };

      expect(getUserStatus(user)).not.toBe('locked');
    });
  });

  describe('when user is unverified', () => {
    it('should return unverified when emailVerified is false', () => {
      const user: AdminUser = {
        ...baseUser,
        emailVerified: false,
        lockedUntil: null,
      };

      expect(getUserStatus(user)).toBe('unverified');
    });

    it('should prioritize locked over unverified', () => {
      const futureDate = new Date(Date.now() + 3600000).toISOString();
      const user: AdminUser = {
        ...baseUser,
        emailVerified: false,
        lockedUntil: futureDate,
      };

      expect(getUserStatus(user)).toBe('locked');
    });
  });

  describe('when user is active', () => {
    it('should return active when user is verified and not locked', () => {
      const user: AdminUser = {
        ...baseUser,
        emailVerified: true,
        lockedUntil: null,
      };

      expect(getUserStatus(user)).toBe('active');
    });

    it('should return active when lockedUntil has expired', () => {
      const pastDate = new Date(Date.now() - 3600000).toISOString();
      const user: AdminUser = {
        ...baseUser,
        emailVerified: true,
        lockedUntil: pastDate,
      };

      expect(getUserStatus(user)).toBe('active');
    });
  });

  describe('edge cases', () => {
    it('should handle exact boundary when lockedUntil equals current time', () => {
      const now = new Date();
      const user: AdminUser = {
        ...baseUser,
        lockedUntil: now.toISOString(),
      };

      // At exact boundary, the check is > now, so should not be locked
      const status = getUserStatus(user);
      expect(status).not.toBe('locked');
    });

    it('should handle user with failed login attempts but not locked', () => {
      const user: AdminUser = {
        ...baseUser,
        failedLoginAttempts: 3,
        lockedUntil: null,
      };

      expect(getUserStatus(user)).toBe('active');
    });
  });
});
