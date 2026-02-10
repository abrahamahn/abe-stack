// src/apps/web/src/features/admin/components/UserTable.tsx
/**
 * UserTable Component
 *
 * Displays users in a table format with pagination for admin management.
 */

import {
  Button,
  Pagination,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Text,
  useNavigate,
} from '@abe-stack/ui';

import { RoleBadge } from './RoleBadge';
import { getUserStatus, StatusBadge } from './StatusBadge';

import type { AdminUser, AdminUserListResponse } from '@abe-stack/shared';
import type { JSX } from 'react';

type AdminUserLocal = AdminUser;
type AdminUserListResponseLocal = AdminUserListResponse;

export interface UserTableProps {
  data: AdminUserListResponseLocal | undefined;
  isLoading: boolean;
  page: number;
  onPageChange: (page: number) => void;
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString();
}

export const UserTable = ({ data, isLoading, page, onPageChange }: UserTableProps): JSX.Element => {
  const navigate = useNavigate();

  const handleRowClick = (user: AdminUserLocal): void => {
    navigate(`/admin/users/${user.id}`);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 10 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  if (data === undefined) {
    return (
      <div className="text-center py-12">
        <Text tone="muted">No users found</Text>
      </div>
    );
  }

  if (data.data.length === 0) {
    return (
      <div className="text-center py-12">
        <Text tone="muted">No users found</Text>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Email</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Created</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.data.map((user: AdminUserLocal) => (
            <TableRow
              key={user.id}
              className="cursor-pointer hover-row"
              onClick={() => {
                handleRowClick(user);
              }}
            >
              <TableCell>
                <Text size="sm">{user.email}</Text>
              </TableCell>
              <TableCell>
                <Text size="sm">
                  {`${user.firstName} ${user.lastName}`.trim() !== ''
                    ? `${user.firstName} ${user.lastName}`.trim()
                    : user.username}
                </Text>
              </TableCell>
              <TableCell>
                <RoleBadge role={user.role} />
              </TableCell>
              <TableCell>
                <StatusBadge status={getUserStatus(user)} />
              </TableCell>
              <TableCell>
                <Text size="sm">{formatDate(user.createdAt)}</Text>
              </TableCell>
              <TableCell>
                <Button
                  variant="secondary"
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRowClick(user);
                  }}
                >
                  View
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <div className="flex items-center justify-between">
        <Text tone="muted" size="sm">
          Showing {data.data.length} of {data.total} users
        </Text>
        <Pagination value={page} totalPages={data.totalPages} onChange={onPageChange} />
      </div>
    </div>
  );
};
