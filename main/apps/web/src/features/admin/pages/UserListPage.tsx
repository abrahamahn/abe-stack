// main/apps/web/src/features/admin/pages/UserListPage.tsx
/**
 * UserListPage Component
 *
 * Admin page for listing and managing users.
 */

import { Alert, Button, Heading, PageContainer, Text } from '@bslt/ui';

import { UserFilters, UserTable } from '../components';
import { useAdminUsers } from '../hooks';

import type { JSX } from 'react';

export const UserListPage = (): JSX.Element => {
  const adminUsersResult = useAdminUsers();
  const {
    users,
    total,
    page,
    totalPages,
    hasNext,
    hasPrev,
    isLoading,
    error,
    setFilters,
    setPage,
    refresh,
    filters,
  } = adminUsersResult;

  return (
    <PageContainer>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <Heading as="h1" size="xl">
              User Management
            </Heading>
            <Text tone="muted" className="mt-1">
              View and manage user accounts
            </Text>
          </div>
          <Button
            onClick={() => {
              void refresh();
            }}
            disabled={isLoading}
          >
            Refresh
          </Button>
        </div>

        {/* Error Alert */}
        {error !== null && <Alert tone="danger">{error}</Alert>}

        {/* Filters */}
        <UserFilters filters={filters} onFiltersChange={setFilters} isLoading={isLoading} />

        {/* User Table */}
        <UserTable
          data={
            users.length > 0 || isLoading
              ? {
                  data: users,
                  total,
                  page,
                  limit: 20,
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
};
