// apps/web/src/features/admin/pages/UserListPage.tsx
/**
 * UserListPage Component
 *
 * Admin page for listing and managing users.
 */

import { Alert, Button, Heading, PageContainer } from '@abe-stack/ui';

import { UserFilters, UserTable } from '../components';
import { useAdminUsers } from '../hooks';

import type { JSX } from 'react';

export function UserListPage(): JSX.Element {
  const {
    users,
    total,
    page,
    totalPages,
    hasNext,
    hasPrev,
    isLoading,
    error,
    filters,
    setFilters,
    setPage,
    refresh,
  } = useAdminUsers();

  return (
    <PageContainer>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <Heading as="h1" size="xl">
              User Management
            </Heading>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              View and manage user accounts
            </p>
          </div>
          <Button onClick={() => refresh()} disabled={isLoading}>
            Refresh
          </Button>
        </div>

        {/* Error Alert */}
        {error && (
          <Alert tone="danger">
            {error}
          </Alert>
        )}

        {/* Filters */}
        <UserFilters
          filters={filters}
          onFiltersChange={setFilters}
          isLoading={isLoading}
        />

        {/* User Table */}
        <UserTable
          data={
            users.length > 0 || isLoading
              ? {
                  data: users,
                  total,
                  page,
                  limit: filters.limit ?? 20,
                  totalPages,
                  hasNext,
                  hasPrev,
                }
              : undefined
          }
          isLoading={isLoading}
          page={page}
          onPageChange={setPage}
        />
      </div>
    </PageContainer>
  );
}
