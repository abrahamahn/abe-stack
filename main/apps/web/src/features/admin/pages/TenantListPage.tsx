// main/apps/web/src/features/admin/pages/TenantListPage.tsx
/**
 * TenantListPage Component
 *
 * Admin page for listing and managing tenants/workspaces.
 */

import { useNavigate } from '@bslt/react/router';
import { formatDate } from '@bslt/shared';
import {
  Alert,
  Badge,
  Button,
  Heading,
  PageContainer,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Text,
} from '@bslt/ui';

import { useTenants } from '../hooks';

import type { AdminTenantLocal } from '../services/adminApi';
import type { JSX } from 'react';

export const TenantListPage = (): JSX.Element => {
  const { tenants, total, isLoading, error, refresh } = useTenants();
  const navigate = useNavigate();

  const handleRowClick = (tenant: AdminTenantLocal): void => {
    navigate(`/admin/tenants/${tenant.id}`);
  };

  return (
    <PageContainer>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <Heading as="h1" size="xl">
              Tenant Management
            </Heading>
            <Text tone="muted" className="mt-1">
              View and manage workspaces
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

        {/* Loading State */}
        {isLoading && (
          <div className="space-y-4">
            {Array.from({ length: 10 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        )}

        {/* Empty State */}
        {!isLoading && tenants.length === 0 && error === null && (
          <div className="text-center py-12">
            <Text tone="muted">No tenants found</Text>
          </div>
        )}

        {/* Tenant Table */}
        {!isLoading && tenants.length > 0 && (
          <div className="space-y-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead>Members</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tenants.map((tenant: AdminTenantLocal) => (
                  <TableRow
                    key={tenant.id}
                    className="cursor-pointer hover-row"
                    onClick={() => {
                      handleRowClick(tenant);
                    }}
                  >
                    <TableCell>
                      <Text size="sm">{tenant.name}</Text>
                    </TableCell>
                    <TableCell>
                      <Text size="sm" tone="muted">
                        {tenant.slug}
                      </Text>
                    </TableCell>
                    <TableCell>
                      <Text size="sm">{tenant.memberCount}</Text>
                    </TableCell>
                    <TableCell>
                      <Badge tone={tenant.isActive ? 'success' : 'danger'}>
                        {tenant.isActive ? 'Active' : 'Suspended'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Text size="sm">{formatDate(tenant.createdAt)}</Text>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="secondary"
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRowClick(tenant);
                        }}
                      >
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <Text tone="muted" size="sm">
              Showing {tenants.length} of {total} tenants
            </Text>
          </div>
        )}
      </div>
    </PageContainer>
  );
};
