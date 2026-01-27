// apps/web/src/features/admin/components/UserDetailCard.test.tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { UserDetailCard } from './UserDetailCard';

import type { AdminUser } from '@abe-stack/core';

describe('UserDetailCard', () => {
  const mockUser: AdminUser = {
    id: 'user-123',
    email: 'test@example.com',
    name: 'Test User',
    role: 'user',
    emailVerified: true,
    emailVerifiedAt: '2024-01-15T10:30:00Z',
    failedLoginAttempts: 2,
    lockedUntil: null,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-10T00:00:00Z',
  };

  describe('when loading', () => {
    it('should render skeleton loaders', () => {
      const { container } = render(<UserDetailCard user={null} isLoading={true} />);

      // Check for skeleton elements
      const skeletons = container.querySelectorAll('[class*="animate"]');
      expect(skeletons.length).toBeGreaterThan(0);
    });

    it('should not render user details when loading', () => {
      render(<UserDetailCard user={mockUser} isLoading={true} />);

      expect(screen.queryByText('User Details')).not.toBeInTheDocument();
      expect(screen.queryByText('test@example.com')).not.toBeInTheDocument();
    });
  });

  describe('when user is null', () => {
    it('should render user not found message', () => {
      render(<UserDetailCard user={null} isLoading={false} />);

      expect(screen.getByText('User not found')).toBeInTheDocument();
    });

    it('should not render user details', () => {
      render(<UserDetailCard user={null} isLoading={false} />);

      expect(screen.queryByText('User Details')).not.toBeInTheDocument();
    });
  });

  describe('when user is loaded', () => {
    it('should render user details heading', () => {
      render(<UserDetailCard user={mockUser} isLoading={false} />);

      expect(screen.getByText('User Details')).toBeInTheDocument();
    });

    it('should display user ID', () => {
      render(<UserDetailCard user={mockUser} isLoading={false} />);

      expect(screen.getByText('ID')).toBeInTheDocument();
      expect(screen.getByText('user-123')).toBeInTheDocument();
    });

    it('should display email', () => {
      render(<UserDetailCard user={mockUser} isLoading={false} />);

      expect(screen.getByText('Email')).toBeInTheDocument();
      expect(screen.getByText('test@example.com')).toBeInTheDocument();
    });

    it('should display name', () => {
      render(<UserDetailCard user={mockUser} isLoading={false} />);

      expect(screen.getByText('Name')).toBeInTheDocument();
      expect(screen.getByText('Test User')).toBeInTheDocument();
    });

    it('should display role with RoleBadge', () => {
      render(<UserDetailCard user={mockUser} isLoading={false} />);

      expect(screen.getByText('Role')).toBeInTheDocument();
      expect(screen.getByText('User')).toBeInTheDocument();
    });

    it('should display status with StatusBadge', () => {
      render(<UserDetailCard user={mockUser} isLoading={false} />);

      expect(screen.getByText('Status')).toBeInTheDocument();
      expect(screen.getByText('Active')).toBeInTheDocument();
    });

    it('should display email verified status', () => {
      render(<UserDetailCard user={mockUser} isLoading={false} />);

      expect(screen.getByText('Email Verified')).toBeInTheDocument();
      expect(screen.getByText('Yes')).toBeInTheDocument();
    });

    it('should display failed login attempts', () => {
      render(<UserDetailCard user={mockUser} isLoading={false} />);

      expect(screen.getByText('Failed Login Attempts')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument();
    });

    it('should format and display created at date', () => {
      render(<UserDetailCard user={mockUser} isLoading={false} />);

      expect(screen.getByText('Created At')).toBeInTheDocument();
      // Date format depends on locale, just check it's present
      const createdAtValue = screen.getAllByText(/2024/i);
      expect(createdAtValue.length).toBeGreaterThan(0);
    });

    it('should format and display updated at date', () => {
      render(<UserDetailCard user={mockUser} isLoading={false} />);

      expect(screen.getByText('Updated At')).toBeInTheDocument();
    });
  });

  describe('when user has no name', () => {
    it('should display "Not set" for null name', () => {
      const userWithoutName: AdminUser = {
        ...mockUser,
        name: null,
      };

      render(<UserDetailCard user={userWithoutName} isLoading={false} />);

      expect(screen.getByText('Not set')).toBeInTheDocument();
    });
  });

  describe('when user is not email verified', () => {
    it('should display No for email verified', () => {
      const unverifiedUser: AdminUser = {
        ...mockUser,
        emailVerified: false,
        emailVerifiedAt: null,
      };

      render(<UserDetailCard user={unverifiedUser} isLoading={false} />);

      expect(screen.getByText('No')).toBeInTheDocument();
    });

    it('should display Never for email verified at when null', () => {
      const unverifiedUser: AdminUser = {
        ...mockUser,
        emailVerified: false,
        emailVerifiedAt: null,
      };

      render(<UserDetailCard user={unverifiedUser} isLoading={false} />);

      expect(screen.getByText('Never')).toBeInTheDocument();
    });

    it('should display Never for email verified at when empty string', () => {
      const unverifiedUser: AdminUser = {
        ...mockUser,
        emailVerified: false,
        emailVerifiedAt: '',
      };

      render(<UserDetailCard user={unverifiedUser} isLoading={false} />);

      expect(screen.getByText('Never')).toBeInTheDocument();
    });
  });

  describe('when user is locked', () => {
    it('should display locked until date', () => {
      const lockedUser: AdminUser = {
        ...mockUser,
        lockedUntil: '2024-12-31T23:59:59Z',
      };

      render(<UserDetailCard user={lockedUser} isLoading={false} />);

      expect(screen.getByText('Locked Until')).toBeInTheDocument();
    });

    it('should not display locked until when null', () => {
      render(<UserDetailCard user={mockUser} isLoading={false} />);

      expect(screen.queryByText('Locked Until')).not.toBeInTheDocument();
    });

    it('should not display locked until when empty string', () => {
      const user: AdminUser = {
        ...mockUser,
        lockedUntil: '',
      };

      render(<UserDetailCard user={user} isLoading={false} />);

      expect(screen.queryByText('Locked Until')).not.toBeInTheDocument();
    });
  });

  describe('date formatting edge cases', () => {
    it('should handle Never for null dates', () => {
      const user: AdminUser = {
        ...mockUser,
        emailVerifiedAt: null,
      };

      render(<UserDetailCard user={user} isLoading={false} />);

      expect(screen.getByText('Email Verified At')).toBeInTheDocument();
      expect(screen.getByText('Never')).toBeInTheDocument();
    });

    it('should handle Never for empty string dates', () => {
      const user: AdminUser = {
        ...mockUser,
        emailVerifiedAt: '',
      };

      render(<UserDetailCard user={user} isLoading={false} />);

      expect(screen.getByText('Never')).toBeInTheDocument();
    });
  });

  describe('integration with child components', () => {
    it('should render RoleBadge component', () => {
      render(<UserDetailCard user={mockUser} isLoading={false} />);

      // RoleBadge should render the role
      expect(screen.getByText('User')).toBeInTheDocument();
    });

    it('should render StatusBadge component', () => {
      render(<UserDetailCard user={mockUser} isLoading={false} />);

      // StatusBadge should render the status
      expect(screen.getByText('Active')).toBeInTheDocument();
    });
  });
});
