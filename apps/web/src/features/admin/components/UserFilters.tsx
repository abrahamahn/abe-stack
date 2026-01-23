// apps/web/src/features/admin/components/UserFilters.tsx
/**
 * UserFilters Component
 *
 * Filter controls for the admin user list.
 */

import { Button, Input, Select } from '@abe-stack/ui';
import { useCallback, useState } from 'react';

import type { AdminUserListFilters, UserRole, UserStatus } from '@abe-stack/core';
import type { JSX, FormEvent } from 'react';

export interface UserFiltersProps {
  filters: AdminUserListFilters;
  onFiltersChange: (filters: AdminUserListFilters) => void;
  isLoading?: boolean;
}

const ROLE_OPTIONS = [
  { value: '', label: 'All Roles' },
  { value: 'admin', label: 'Admin' },
  { value: 'moderator', label: 'Moderator' },
  { value: 'user', label: 'User' },
];

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'active', label: 'Active' },
  { value: 'locked', label: 'Locked' },
  { value: 'unverified', label: 'Unverified' },
];

const SORT_OPTIONS = [
  { value: 'createdAt', label: 'Date Created' },
  { value: 'updatedAt', label: 'Date Updated' },
  { value: 'email', label: 'Email' },
  { value: 'name', label: 'Name' },
];

export function UserFilters({
  filters,
  onFiltersChange,
  isLoading = false,
}: UserFiltersProps): JSX.Element {
  const [searchValue, setSearchValue] = useState(filters.search ?? '');

  const handleSearch = useCallback(
    (e: FormEvent) => {
      e.preventDefault();
      onFiltersChange({ search: searchValue || undefined });
    },
    [searchValue, onFiltersChange],
  );

  const handleRoleChange = useCallback(
    (value: string) => {
      onFiltersChange({ role: (value || undefined) as UserRole | undefined });
    },
    [onFiltersChange],
  );

  const handleStatusChange = useCallback(
    (value: string) => {
      onFiltersChange({ status: (value || undefined) as UserStatus | undefined });
    },
    [onFiltersChange],
  );

  const handleSortChange = useCallback(
    (value: string) => {
      onFiltersChange({
        sortBy: value as AdminUserListFilters['sortBy'],
      });
    },
    [onFiltersChange],
  );

  const handleSortOrderToggle = useCallback(() => {
    onFiltersChange({
      sortOrder: filters.sortOrder === 'asc' ? 'desc' : 'asc',
    });
  }, [filters.sortOrder, onFiltersChange]);

  const handleClearFilters = useCallback(() => {
    setSearchValue('');
    onFiltersChange({
      search: undefined,
      role: undefined,
      status: undefined,
      sortBy: 'createdAt',
      sortOrder: 'desc',
    });
  }, [onFiltersChange]);

  const hasActiveFilters = Boolean(
    filters.search || filters.role || filters.status,
  );

  return (
    <div className="space-y-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
      {/* Search */}
      <form onSubmit={handleSearch} className="flex gap-2">
        <Input
          type="text"
          placeholder="Search by email or name..."
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          className="flex-1"
          disabled={isLoading}
        />
        <Button type="submit" disabled={isLoading}>
          Search
        </Button>
      </form>

      {/* Filters Row */}
      <div className="flex flex-wrap gap-4 items-center">
        {/* Role Filter */}
        <div className="flex items-center gap-2">
          <label htmlFor="role-filter" className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Role:
          </label>
          <Select
            id="role-filter"
            value={filters.role ?? ''}
            onChange={handleRoleChange}
            disabled={isLoading}
          >
            {ROLE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-2">
          <label htmlFor="status-filter" className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Status:
          </label>
          <Select
            id="status-filter"
            value={filters.status ?? ''}
            onChange={handleStatusChange}
            disabled={isLoading}
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </div>

        {/* Sort */}
        <div className="flex items-center gap-2">
          <label htmlFor="sort-filter" className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Sort by:
          </label>
          <Select
            id="sort-filter"
            value={filters.sortBy ?? 'createdAt'}
            onChange={handleSortChange}
            disabled={isLoading}
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
          <Button
            variant="secondary"
            size="small"
            onClick={handleSortOrderToggle}
            disabled={isLoading}
            title={filters.sortOrder === 'asc' ? 'Ascending' : 'Descending'}
          >
            {filters.sortOrder === 'asc' ? '\u2191' : '\u2193'}
          </Button>
        </div>

        {/* Clear Filters */}
        {hasActiveFilters && (
          <Button
            variant="secondary"
            size="small"
            onClick={handleClearFilters}
            disabled={isLoading}
          >
            Clear Filters
          </Button>
        )}
      </div>
    </div>
  );
}
