// src/apps/web/src/features/admin/components/UserFilters.tsx
/**
 * UserFilters Component
 *
 * Filter controls for the admin user list.
 */

import { Button, Input, Select } from '@abe-stack/ui';
import { useCallback, useState } from 'react';

import type { AdminUserListFilters } from '@abe-stack/shared';
import type { JSX } from 'react';

type AdminUserListFiltersLocal = AdminUserListFilters;

export interface UserFiltersProps {
  filters: AdminUserListFiltersLocal;
  onFiltersChange: (filters: AdminUserListFiltersLocal) => void;
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
  { value: 'username', label: 'Username' },
  { value: 'firstName', label: 'First Name' },
  { value: 'lastName', label: 'Last Name' },
];

export const UserFilters = ({
  filters,
  onFiltersChange,
  isLoading = false,
}: UserFiltersProps): JSX.Element => {
  const [searchValue, setSearchValue] = useState(filters.search ?? '');

  const handleSearch = useCallback(
    (e: React.SyntheticEvent<HTMLFormElement>) => {
      e.preventDefault();
      onFiltersChange({ ...(searchValue.length > 0 && { search: searchValue }) });
    },
    [searchValue, onFiltersChange],
  );

  const handleRoleChange = useCallback(
    (value: string) => {
      onFiltersChange({
        ...(value.length > 0 && { role: value as 'user' | 'moderator' | 'admin' }),
      });
    },
    [onFiltersChange],
  );

  const handleStatusChange = useCallback(
    (value: string) => {
      onFiltersChange({
        ...(value.length > 0 && { status: value as 'active' | 'locked' | 'unverified' }),
      });
    },
    [onFiltersChange],
  );

  const handleSortChange = useCallback(
    (value: string) => {
      if (value.length > 0) {
        const newFilters: AdminUserListFiltersLocal = {
          ...filters,
          sortBy: value as
            | 'email'
            | 'username'
            | 'firstName'
            | 'lastName'
            | 'createdAt'
            | 'updatedAt',
        };
        onFiltersChange(newFilters);
      }
    },
    [onFiltersChange, filters],
  );

  const handleSortOrderToggle = useCallback(() => {
    onFiltersChange({
      ...filters,
      sortOrder: filters.sortOrder === 'asc' ? 'desc' : 'asc',
    });
  }, [filters, onFiltersChange]);

  const handleClearFilters = useCallback(() => {
    setSearchValue('');
    onFiltersChange({
      sortBy: 'createdAt',
      sortOrder: 'desc',
    });
  }, [onFiltersChange]);

  const hasActiveFilters =
    (filters.search !== undefined && filters.search.length > 0) ||
    filters.role !== undefined ||
    filters.status !== undefined;

  return (
    <div className="space-y-4 p-4 bg-surface rounded-lg">
      {/* Search */}
      <form onSubmit={handleSearch} className="flex gap-2">
        <Input
          type="text"
          placeholder="Search by email or name..."
          value={searchValue}
          onChange={(e) => {
            setSearchValue(e.target.value);
          }}
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
          <label htmlFor="role-filter" className="text-sm font-medium text-muted">
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
          <label htmlFor="status-filter" className="text-sm font-medium text-muted">
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
          <label htmlFor="sort-filter" className="text-sm font-medium text-muted">
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
};
