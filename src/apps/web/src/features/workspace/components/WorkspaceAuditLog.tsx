// src/apps/web/src/features/workspace/components/WorkspaceAuditLog.tsx
/**
 * Workspace Audit Log
 *
 * Displays a table of audit events for the workspace.
 */

import {
  Alert,
  Badge,
  EmptyState,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Text,
} from '@abe-stack/ui';

import { useAuditLog } from '../hooks/useAuditLog';

import type { ReactElement } from 'react';

// ============================================================================
// Types
// ============================================================================

export interface WorkspaceAuditLogProps {
  tenantId: string;
}

// ============================================================================
// Helpers
// ============================================================================

const ACTION_TONES: Record<string, 'info' | 'success' | 'warning' | 'danger'> = {
  create: 'success',
  update: 'info',
  delete: 'danger',
  invite: 'info',
  remove: 'warning',
};

function getActionTone(action: string): 'info' | 'success' | 'warning' | 'danger' {
  const prefix = action.split('.')[0] ?? '';
  return ACTION_TONES[prefix] ?? 'info';
}

// ============================================================================
// Component
// ============================================================================

export const WorkspaceAuditLog = ({ tenantId }: WorkspaceAuditLogProps): ReactElement => {
  const { events, isLoading, error } = useAuditLog(tenantId);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-3 p-4">
        <Skeleton width="8rem" height="1.25rem" />
        <Skeleton width="100%" height="2rem" />
        <Skeleton width="100%" height="2rem" />
        <Skeleton width="100%" height="2rem" />
      </div>
    );
  }

  if (error !== null) {
    return <Alert tone="danger">{error.message}</Alert>;
  }

  if (events.length === 0) {
    return <EmptyState title="No audit events" description="Audit events will appear here as actions are recorded" />;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Action</TableHead>
          <TableHead>Actor</TableHead>
          <TableHead>Date</TableHead>
          <TableHead>Details</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {events.map((event) => (
          <TableRow key={event.id}>
            <TableCell>
              <Badge tone={getActionTone(event.action)}>{event.action}</Badge>
            </TableCell>
            <TableCell>
              <Text size="sm">{event.actorId}</Text>
            </TableCell>
            <TableCell>
              <Text size="sm" tone="muted">
                {new Date(event.createdAt).toLocaleString()}
              </Text>
            </TableCell>
            <TableCell>
              <Text size="sm" tone="muted">
                {event.details}
              </Text>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};
