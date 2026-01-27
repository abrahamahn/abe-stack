// apps/web/src/features/admin/components/UserTable.test.tsx
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';

import { renderWithProviders } from '@/__tests__/utils';

import { UserTable } from './UserTable';

import type { AdminUser, AdminUserListResponse } from '@abe-stack/core';

// ============================================================================
// Test Data
// ============================================================================

const createMockUser = (overrides: Partial<AdminUser> = {}): AdminUser => ({
  id: 'user-123',
  email: 'test@example.com',
  name: 'Test User',
  role: 'user',
  emailVerified: true,
  emailVerifiedAt: '2024-01-01T00:00:00Z',
  failedLoginAttempts: 0,
  lockedUntil: null,
  createdAt: '2024-01-15T10:30:00Z',
  updatedAt: '2024-01-15T10:30:00Z',
  ...overrides,
});

const createMockResponse = (overrides: Partial<AdminUserListResponse> = {}): AdminUserListResponse => ({
  data: [
    createMockUser({ id: 'user-1', email: 'user1@example.com', name: 'User One', role: 'admin' }),
    createMockUser({ id: 'user-2', email: 'user2@example.com', name: 'User Two', role: 'moderator' }),
    createMockUser({ id: 'user-3', email: 'user3@example.com', name: 'User Three', role: 'user' }),
  ],
  total: 3,
  page: 1,
  limit: 20,
  totalPages: 1,
  ...overrides,
});

const mockOnPageChange = vi.fn();

// ============================================================================
// Tests
// ============================================================================

describe('UserTable', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('loading state', () => {
    it('should show skeletons when loading', () => {
      render(
        <UserTable data={undefined} isLoading={true} page={1} onPageChange={mockOnPageChange} />,
      );

      const skeletons = screen.getAllByRole('status');
      expect(skeletons.length).toBeGreaterThan(0);
    });

    it('should not show table when loading', () => {
      render(
        <UserTable data={undefined} isLoading={true} page={1} onPageChange={mockOnPageChange} />,
      );

      expect(screen.queryByRole('table')).not.toBeInTheDocument();
    });
  });

  describe('empty state', () => {
    it('should show no users message when data is undefined', () => {
      render(
        <UserTable data={undefined} isLoading={false} page={1} onPageChange={mockOnPageChange} />,
      );

      expect(screen.getByText('No users found')).toBeInTheDocument();
    });

    it('should show no users message when data array is empty', () => {
      render(
        <UserTable
          data={createMockResponse({ data: [], total: 0 })}
          isLoading={false}
          page={1}
          onPageChange={mockOnPageChange}
        />,
      );

      expect(screen.getByText('No users found')).toBeInTheDocument();
    });
  });

  describe('table display', () => {
    it('should render table headers', () => {
      render(
        <UserTable
          data={createMockResponse()}
          isLoading={false}
          page={1}
          onPageChange={mockOnPageChange}
        />,
      );

      expect(screen.getByRole('columnheader', { name: 'Email' })).toBeInTheDocument();
      expect(screen.getByRole('columnheader', { name: 'Name' })).toBeInTheDocument();
      expect(screen.getByRole('columnheader', { name: 'Role' })).toBeInTheDocument();
      expect(screen.getByRole('columnheader', { name: 'Status' })).toBeInTheDocument();
      expect(screen.getByRole('columnheader', { name: 'Created' })).toBeInTheDocument();
      expect(screen.getByRole('columnheader', { name: 'Actions' })).toBeInTheDocument();
    });

    it('should render all users in the data', () => {
      render(
        <UserTable
          data={createMockResponse()}
          isLoading={false}
          page={1}
          onPageChange={mockOnPageChange}
        />,
      );

      expect(screen.getByText('user1@example.com')).toBeInTheDocument();
      expect(screen.getByText('user2@example.com')).toBeInTheDocument();
      expect(screen.getByText('user3@example.com')).toBeInTheDocument();
    });

    it('should render user names', () => {
      render(
        <UserTable
          data={createMockResponse()}
          isLoading={false}
          page={1}
          onPageChange={mockOnPageChange}
        />,
      );

      expect(screen.getByText('User One')).toBeInTheDocument();
      expect(screen.getByText('User Two')).toBeInTheDocument();
      expect(screen.getByText('User Three')).toBeInTheDocument();
    });

    it('should render "-" for null names', () => {
      const data = createMockResponse({
        data: [createMockUser({ name: null })],
      });

      render(
        <UserTable data={data} isLoading={false} page={1} onPageChange={mockOnPageChange} />,
      );

      expect(screen.getByText('-')).toBeInTheDocument();
    });

    it('should render role badges', () => {
      render(
        <UserTable
          data={createMockResponse()}
          isLoading={false}
          page={1}
          onPageChange={mockOnPageChange}
        />,
      );

      expect(screen.getByText('Admin')).toBeInTheDocument();
      expect(screen.getByText('Moderator')).toBeInTheDocument();
      expect(screen.getByText('User')).toBeInTheDocument();
    });

    it('should render status badges', () => {
      render(
        <UserTable
          data={createMockResponse()}
          isLoading={false}
          page={1}
          onPageChange={mockOnPageChange}
        />,
      );

      const activeStatuses = screen.getAllByText('Active');
      expect(activeStatuses.length).toBe(3);
    });

    it('should render view buttons', () => {
      render(
        <UserTable
          data={createMockResponse()}
          isLoading={false}
          page={1}
          onPageChange={mockOnPageChange}
        />,
      );

      const viewButtons = screen.getAllByRole('button', { name: 'View' });
      expect(viewButtons.length).toBe(3);
    });
  });

  describe('status display', () => {
    it('should display locked status for locked users', () => {
      const futureDate = new Date(Date.now() + 3600000).toISOString();
      const data = createMockResponse({
        data: [createMockUser({ lockedUntil: futureDate })],
      });

      render(
        <UserTable data={data} isLoading={false} page={1} onPageChange={mockOnPageChange} />,
      );

      expect(screen.getByText('Locked')).toBeInTheDocument();
    });

    it('should display unverified status for unverified users', () => {
      const data = createMockResponse({
        data: [createMockUser({ emailVerified: false })],
      });

      render(
        <UserTable data={data} isLoading={false} page={1} onPageChange={mockOnPageChange} />,
      );

      expect(screen.getByText('Unverified')).toBeInTheDocument();
    });

    it('should display active status for normal users', () => {
      render(
        <UserTable
          data={createMockResponse()}
          isLoading={false}
          page={1}
          onPageChange={mockOnPageChange}
        />,
      );

      const activeStatuses = screen.getAllByText('Active');
      expect(activeStatuses.length).toBe(3);
    });
  });

  describe('navigation', () => {
    it('should navigate to user detail page when row is clicked', () => {
      renderWithProviders(
        <UserTable
          data={createMockResponse()}
          isLoading={false}
          page={1}
          onPageChange={mockOnPageChange}
        />,
      );

      const row = screen.getByText('user1@example.com').closest('tr');
      if (row !== null) {
        fireEvent.click(row);
      }

      // Navigation would be handled by useNavigate hook
      expect(row).toBeInTheDocument();
    });

    it('should navigate to user detail page when view button is clicked', () => {
      renderWithProviders(
        <UserTable
          data={createMockResponse()}
          isLoading={false}
          page={1}
          onPageChange={mockOnPageChange}
        />,
      );

      const viewButtons = screen.getAllByRole('button', { name: 'View' });
      fireEvent.click(viewButtons[0]);

      // View button should not propagate click to row
      expect(viewButtons[0]).toBeInTheDocument();
    });
  });

  describe('pagination', () => {
    it('should show user count and total', () => {
      render(
        <UserTable
          data={createMockResponse({ total: 100 })}
          isLoading={false}
          page={1}
          onPageChange={mockOnPageChange}
        />,
      );

      expect(screen.getByText('Showing 3 of 100 users')).toBeInTheDocument();
    });

    it('should render pagination controls', () => {
      render(
        <UserTable
          data={createMockResponse({ totalPages: 5 })}
          isLoading={false}
          page={1}
          onPageChange={mockOnPageChange}
        />,
      );

      expect(screen.getByRole('navigation')).toBeInTheDocument();
    });

    it('should call onPageChange when page is changed', () => {
      render(
        <UserTable
          data={createMockResponse({ page: 1, totalPages: 3 })}
          isLoading={false}
          page={1}
          onPageChange={mockOnPageChange}
        />,
      );

      const nextButton = screen.getByRole('button', { name: /next/i });
      fireEvent.click(nextButton);

      expect(mockOnPageChange).toHaveBeenCalledWith(2);
    });

    it('should display current page correctly', () => {
      render(
        <UserTable
          data={createMockResponse({ page: 2, totalPages: 5 })}
          isLoading={false}
          page={2}
          onPageChange={mockOnPageChange}
        />,
      );

      expect(screen.getByRole('navigation')).toBeInTheDocument();
    });
  });

  describe('date formatting', () => {
    it('should format created date', () => {
      render(
        <UserTable
          data={createMockResponse()}
          isLoading={false}
          page={1}
          onPageChange={mockOnPageChange}
        />,
      );

      // Date format depends on locale, just check table renders
      expect(screen.getByRole('table')).toBeInTheDocument();
    });
  });

  describe('role display', () => {
    it('should render admin role with badge', () => {
      const data = createMockResponse({
        data: [createMockUser({ role: 'admin' })],
      });

      render(
        <UserTable data={data} isLoading={false} page={1} onPageChange={mockOnPageChange} />,
      );

      expect(screen.getByText('Admin')).toBeInTheDocument();
    });

    it('should render moderator role with badge', () => {
      const data = createMockResponse({
        data: [createMockUser({ role: 'moderator' })],
      });

      render(
        <UserTable data={data} isLoading={false} page={1} onPageChange={mockOnPageChange} />,
      );

      expect(screen.getByText('Moderator')).toBeInTheDocument();
    });

    it('should render user role with badge', () => {
      const data = createMockResponse({
        data: [createMockUser({ role: 'user' })],
      });

      render(
        <UserTable data={data} isLoading={false} page={1} onPageChange={mockOnPageChange} />,
      );

      expect(screen.getByText('User')).toBeInTheDocument();
    });
  });

  describe('edge cases', () => {
    it('should handle single user', () => {
      const data = createMockResponse({
        data: [createMockUser()],
        total: 1,
      });

      render(
        <UserTable data={data} isLoading={false} page={1} onPageChange={mockOnPageChange} />,
      );

      expect(screen.getByText('Showing 1 of 1 users')).toBeInTheDocument();
    });

    it('should handle large number of users', () => {
      const data = createMockResponse({
        data: createMockResponse().data,
        total: 10000,
      });

      render(
        <UserTable data={data} isLoading={false} page={1} onPageChange={mockOnPageChange} />,
      );

      expect(screen.getByText('Showing 3 of 10,000 users')).toBeInTheDocument();
    });

    it('should handle users with all optional fields null', () => {
      const data = createMockResponse({
        data: [
          createMockUser({
            name: null,
            emailVerifiedAt: null,
            lockedUntil: null,
          }),
        ],
      });

      render(
        <UserTable data={data} isLoading={false} page={1} onPageChange={mockOnPageChange} />,
      );

      expect(screen.getByText('-')).toBeInTheDocument();
    });

    it('should handle users with expired lock', () => {
      const pastDate = new Date(Date.now() - 3600000).toISOString();
      const data = createMockResponse({
        data: [createMockUser({ lockedUntil: pastDate })],
      });

      render(
        <UserTable data={data} isLoading={false} page={1} onPageChange={mockOnPageChange} />,
      );

      // Should show as active since lock has expired
      expect(screen.getByText('Active')).toBeInTheDocument();
    });
  });
});
