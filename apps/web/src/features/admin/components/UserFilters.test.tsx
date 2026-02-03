// apps/web/src/features/admin/components/UserFilters.test.tsx
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { UserFilters } from './UserFilters';

import type { AdminUserListFilters } from '@abe-stack/shared';

describe('UserFilters', () => {
  const defaultFilters: AdminUserListFilters = {
    sortBy: 'createdAt',
    sortOrder: 'desc',
  };

  const onFiltersChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render search input', () => {
      render(<UserFilters filters={defaultFilters as any} onFiltersChange={onFiltersChange} />);

      expect(screen.getByPlaceholderText('Search by email or name...')).toBeInTheDocument();
    });

    it('should render role filter dropdown', () => {
      render(<UserFilters filters={defaultFilters as any} onFiltersChange={onFiltersChange} />);

      expect(screen.getByLabelText('Role:')).toBeInTheDocument();
    });

    it('should render status filter dropdown', () => {
      render(<UserFilters filters={defaultFilters as any} onFiltersChange={onFiltersChange} />);

      expect(screen.getByLabelText('Status:')).toBeInTheDocument();
    });

    it('should render sort by dropdown', () => {
      render(<UserFilters filters={defaultFilters as any} onFiltersChange={onFiltersChange} />);

      expect(screen.getByLabelText('Sort by:')).toBeInTheDocument();
    });

    it('should render sort order toggle button', () => {
      render(<UserFilters filters={defaultFilters as any} onFiltersChange={onFiltersChange} />);

      const sortButton = screen.getByTitle('Descending');
      expect(sortButton).toBeInTheDocument();
    });

    it('should render search button', () => {
      render(<UserFilters filters={defaultFilters as any} onFiltersChange={onFiltersChange} />);

      expect(screen.getByRole('button', { name: 'Search' })).toBeInTheDocument();
    });
  });

  describe('search functionality', () => {
    it('should update search value when typing', () => {
      render(<UserFilters filters={defaultFilters as any} onFiltersChange={onFiltersChange} />);

      const searchInput = screen.getByPlaceholderText('Search by email or name...');
      fireEvent.change(searchInput, { target: { value: 'test search' } });

      expect(searchInput).toHaveValue('test search');
    });

    it('should call onFiltersChange when search form is submitted', () => {
      render(<UserFilters filters={defaultFilters as any} onFiltersChange={onFiltersChange} />);

      const searchInput = screen.getByPlaceholderText('Search by email or name...');
      fireEvent.change(searchInput, { target: { value: 'john' } });

      const searchButton = screen.getByRole('button', { name: 'Search' });
      fireEvent.click(searchButton);

      expect(onFiltersChange).toHaveBeenCalledWith({ search: 'john' });
    });

    it('should not include search in filter when empty', () => {
      render(<UserFilters filters={defaultFilters as any} onFiltersChange={onFiltersChange} />);

      const searchButton = screen.getByRole('button', { name: 'Search' });
      fireEvent.click(searchButton);

      expect(onFiltersChange).toHaveBeenCalledWith({});
    });

    it('should initialize search value from filters', () => {
      const filtersWithSearch: AdminUserListFilters = {
        ...defaultFilters,
        search: 'initial search',
      };

      render(<UserFilters filters={filtersWithSearch as any} onFiltersChange={onFiltersChange} />);

      const searchInput = screen.getByPlaceholderText('Search by email or name...');
      expect(searchInput).toHaveValue('initial search');
    });
  });

  describe('role filter', () => {
    it('should call onFiltersChange when role is selected', () => {
      render(<UserFilters filters={defaultFilters as any} onFiltersChange={onFiltersChange} />);

      // Custom Select: click trigger to open, then click option
      const roleSelectTrigger = screen.getByLabelText('Role:');
      fireEvent.click(roleSelectTrigger);
      const adminOption = screen.getByRole('option', { name: 'Admin' });
      fireEvent.click(adminOption);

      expect(onFiltersChange).toHaveBeenCalledWith({ role: 'admin' });
    });

    it('should not include role when empty value is selected', () => {
      const filtersWithRole: AdminUserListFilters = {
        ...defaultFilters,
        role: 'admin',
      };
      render(<UserFilters filters={filtersWithRole as any} onFiltersChange={onFiltersChange} />);

      // Custom Select: click trigger to open, then click "All Roles" option
      const roleSelectTrigger = screen.getByLabelText('Role:');
      fireEvent.click(roleSelectTrigger);
      const allOption = screen.getByRole('option', { name: 'All Roles' });
      fireEvent.click(allOption);

      expect(onFiltersChange).toHaveBeenCalledWith({});
    });

    it('should display current role value', () => {
      const filtersWithRole: AdminUserListFilters = {
        ...defaultFilters,
        role: 'moderator',
      };

      render(<UserFilters filters={filtersWithRole as any} onFiltersChange={onFiltersChange} />);

      // Custom Select displays current value in the trigger
      expect(screen.getByText('Moderator')).toBeInTheDocument();
    });
  });

  describe('status filter', () => {
    it('should call onFiltersChange when status is selected', () => {
      render(<UserFilters filters={defaultFilters as any} onFiltersChange={onFiltersChange} />);

      // Custom Select: click trigger to open, then click option
      const statusSelectTrigger = screen.getByLabelText('Status:');
      fireEvent.click(statusSelectTrigger);
      const activeOption = screen.getByRole('option', { name: 'Active' });
      fireEvent.click(activeOption);

      expect(onFiltersChange).toHaveBeenCalledWith({ status: 'active' });
    });

    it('should not include status when empty value is selected', () => {
      const filtersWithStatus: AdminUserListFilters = {
        ...defaultFilters,
        status: 'active',
      };
      render(<UserFilters filters={filtersWithStatus as any} onFiltersChange={onFiltersChange} />);

      // Custom Select: click trigger to open, then click "All Statuses" option
      const statusSelectTrigger = screen.getByLabelText('Status:');
      fireEvent.click(statusSelectTrigger);
      const allOption = screen.getByRole('option', { name: 'All Statuses' });
      fireEvent.click(allOption);

      expect(onFiltersChange).toHaveBeenCalledWith({});
    });

    it('should display current status value', () => {
      const filtersWithStatus: AdminUserListFilters = {
        ...defaultFilters,
        status: 'locked',
      };

      render(<UserFilters filters={filtersWithStatus as any} onFiltersChange={onFiltersChange} />);

      // Custom Select displays current value in the trigger
      expect(screen.getByText('Locked')).toBeInTheDocument();
    });
  });

  describe('sort functionality', () => {
    it('should call onFiltersChange when sort by is changed', () => {
      render(<UserFilters filters={defaultFilters as any} onFiltersChange={onFiltersChange} />);

      // Custom Select: click trigger to open, then click option
      const sortSelectTrigger = screen.getByLabelText('Sort by:');
      fireEvent.click(sortSelectTrigger);
      const emailOption = screen.getByRole('option', { name: 'Email' });
      fireEvent.click(emailOption);

      expect(onFiltersChange).toHaveBeenCalledWith({
        ...defaultFilters,
        sortBy: 'email',
      });
    });

    it('should toggle sort order when button is clicked', () => {
      render(<UserFilters filters={defaultFilters as any} onFiltersChange={onFiltersChange} />);

      const sortOrderButton = screen.getByTitle('Descending');
      fireEvent.click(sortOrderButton);

      expect(onFiltersChange).toHaveBeenCalledWith({
        ...defaultFilters,
        sortOrder: 'asc',
      });
    });

    it('should display ascending arrow when sort order is asc', () => {
      const ascFilters: AdminUserListFilters = {
        ...defaultFilters,
        sortOrder: 'asc',
      };

      render(<UserFilters filters={ascFilters as any} onFiltersChange={onFiltersChange} />);

      const sortOrderButton = screen.getByTitle('Ascending');
      expect(sortOrderButton).toHaveTextContent('↑');
    });

    it('should display descending arrow when sort order is desc', () => {
      render(<UserFilters filters={defaultFilters as any} onFiltersChange={onFiltersChange} />);

      const sortOrderButton = screen.getByTitle('Descending');
      expect(sortOrderButton).toHaveTextContent('↓');
    });
  });

  describe('clear filters', () => {
    it('should show clear filters button when filters are active', () => {
      const activeFilters: AdminUserListFilters = {
        ...defaultFilters,
        search: 'test',
        role: 'admin',
      };

      render(<UserFilters filters={activeFilters as any} onFiltersChange={onFiltersChange} />);

      expect(screen.getByRole('button', { name: 'Clear Filters' })).toBeInTheDocument();
    });

    it('should not show clear filters button when no active filters', () => {
      render(<UserFilters filters={defaultFilters as any} onFiltersChange={onFiltersChange} />);

      expect(screen.queryByRole('button', { name: 'Clear Filters' })).not.toBeInTheDocument();
    });

    it('should reset filters when clear button is clicked', () => {
      const activeFilters: AdminUserListFilters = {
        ...defaultFilters,
        search: 'test',
        role: 'admin',
        status: 'active',
      };

      render(<UserFilters filters={activeFilters as any} onFiltersChange={onFiltersChange} />);

      const clearButton = screen.getByRole('button', { name: 'Clear Filters' });
      fireEvent.click(clearButton);

      expect(onFiltersChange).toHaveBeenCalledWith({
        sortBy: 'createdAt',
        sortOrder: 'desc',
      });
    });

    it('should clear search input when clear filters is clicked', () => {
      const activeFilters: AdminUserListFilters = {
        ...defaultFilters,
        search: 'test search',
      };

      render(<UserFilters filters={activeFilters as any} onFiltersChange={onFiltersChange} />);

      const clearButton = screen.getByRole('button', { name: 'Clear Filters' });
      fireEvent.click(clearButton);

      const searchInput = screen.getByPlaceholderText('Search by email or name...');
      expect(searchInput).toHaveValue('');
    });
  });

  describe('loading state', () => {
    it('should disable search input when loading', () => {
      render(
        <UserFilters filters={defaultFilters as any} onFiltersChange={onFiltersChange} isLoading={true} />,
      );

      const searchInput = screen.getByPlaceholderText('Search by email or name...');
      expect(searchInput).toBeDisabled();
    });

    it('should disable all buttons when loading', () => {
      render(
        <UserFilters filters={defaultFilters as any} onFiltersChange={onFiltersChange} isLoading={true} />,
      );

      const buttons = screen.getAllByRole('button');
      buttons.forEach((button) => {
        expect(button).toBeDisabled();
      });
    });

    it('should disable select dropdowns when loading', () => {
      render(
        <UserFilters filters={defaultFilters as any} onFiltersChange={onFiltersChange} isLoading={true} />,
      );

      const roleSelect = screen.getByLabelText('Role:');
      const statusSelect = screen.getByLabelText('Status:');
      const sortSelect = screen.getByLabelText('Sort by:');

      expect(roleSelect).toBeDisabled();
      expect(statusSelect).toBeDisabled();
      expect(sortSelect).toBeDisabled();
    });
  });

  describe('edge cases', () => {
    it('should handle undefined search in filters', () => {
      const filtersWithoutSearch: AdminUserListFilters = {
        sortBy: 'createdAt',
        sortOrder: 'desc',
      };

      render(<UserFilters filters={filtersWithoutSearch as any} onFiltersChange={onFiltersChange} />);

      const searchInput = screen.getByPlaceholderText('Search by email or name...');
      expect(searchInput).toHaveValue('');
    });

    it('should handle form submission with Enter key', () => {
      render(<UserFilters filters={defaultFilters as any} onFiltersChange={onFiltersChange} />);

      const searchInput = screen.getByPlaceholderText('Search by email or name...');
      fireEvent.change(searchInput, { target: { value: 'search term' } });
      fireEvent.submit(searchInput.closest('form')!);

      expect(onFiltersChange).toHaveBeenCalledWith({ search: 'search term' });
    });
  });
});
