// apps/web/src/features/admin/components/UserDetailCard.tsx
/**
 * UserDetailCard Component
 *
 * Displays detailed information about a user for admin viewing.
 */

import { Card, Heading, Skeleton, Text } from '@abe-stack/ui';

import { RoleBadge } from './RoleBadge';
import { getUserStatus, StatusBadge } from './StatusBadge';

import type { AdminUser } from '@abe-stack/core';
import type { JSX } from 'react';

export interface UserDetailCardProps {
  user: AdminUser | null;
  isLoading: boolean;
}

function formatDateTime(dateString: string | null): string {
  if (!dateString) return 'Never';
  return new Date(dateString).toLocaleString();
}

function InfoRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}): JSX.Element {
  return (
    <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-700 last:border-0">
      <Text className="font-medium text-gray-500 dark:text-gray-400">{label}</Text>
      <div>{children}</div>
    </div>
  );
}

export function UserDetailCard({ user, isLoading }: UserDetailCardProps): JSX.Element {
  if (isLoading) {
    return (
      <Card>
        <div className="space-y-4 p-4">
          <Skeleton className="h-8 w-1/2" />
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-6 w-full" />
          ))}
        </div>
      </Card>
    );
  }

  if (!user) {
    return (
      <Card>
        <div className="p-4 text-center">
          <Text tone="muted">User not found</Text>
        </div>
      </Card>
    );
  }

  const status = getUserStatus(user);

  return (
    <Card>
      <div className="p-6">
        <Heading as="h2" size="lg" className="mb-4">
          User Details
        </Heading>

        <div className="space-y-1">
          <InfoRow label="ID">
            <Text className="font-mono text-sm">{user.id}</Text>
          </InfoRow>

          <InfoRow label="Email">
            <Text>{user.email}</Text>
          </InfoRow>

          <InfoRow label="Name">
            <Text>{user.name ?? 'Not set'}</Text>
          </InfoRow>

          <InfoRow label="Role">
            <RoleBadge role={user.role} />
          </InfoRow>

          <InfoRow label="Status">
            <StatusBadge status={status} />
          </InfoRow>

          <InfoRow label="Email Verified">
            <Text>{user.emailVerified ? 'Yes' : 'No'}</Text>
          </InfoRow>

          <InfoRow label="Email Verified At">
            <Text size="sm">{formatDateTime(user.emailVerifiedAt)}</Text>
          </InfoRow>

          <InfoRow label="Failed Login Attempts">
            <Text>{user.failedLoginAttempts}</Text>
          </InfoRow>

          {user.lockedUntil && (
            <InfoRow label="Locked Until">
              <Text size="sm">{formatDateTime(user.lockedUntil)}</Text>
            </InfoRow>
          )}

          <InfoRow label="Created At">
            <Text size="sm">{formatDateTime(user.createdAt)}</Text>
          </InfoRow>

          <InfoRow label="Updated At">
            <Text size="sm">{formatDateTime(user.updatedAt)}</Text>
          </InfoRow>
        </div>
      </div>
    </Card>
  );
}
