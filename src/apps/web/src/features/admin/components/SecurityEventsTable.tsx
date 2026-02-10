// src/apps/web/src/features/admin/components/SecurityEventsTable.tsx
/**
 * SecurityEventsTable Component
 *
 * Displays security events in a table format with pagination.
 */

import {
  Badge,
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

import type { JSX } from 'react';

// ============================================================================
// Types
// ============================================================================

interface SecurityEventLocal {
  id: string;
  createdAt: string;
  eventType: string;
  severity: string;
  email?: string | null;
  ipAddress?: string | null;
}

interface SecurityEventsListResponseLocal {
  data: SecurityEventLocal[];
  total: number;
  totalPages: number;
}

interface PaginationOptionsLocal {
  page: number;
  limit: number;
}

export interface SecurityEventsTableProps {
  data: SecurityEventsListResponseLocal | undefined;
  isLoading: boolean;
  pagination: PaginationOptionsLocal;
  onPageChange: (page: number) => void;
}

// ============================================================================
// Helper Functions
// ============================================================================

function severityToTone(severity: string): 'danger' | 'warning' | 'info' | 'success' {
  switch (severity) {
    case 'critical':
      return 'danger';
    case 'high':
      return 'danger';
    case 'medium':
      return 'warning';
    case 'low':
      return 'success';
    default:
      return 'info';
  }
}

function formatEventType(eventType: string): string {
  return eventType.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleString();
}

// ============================================================================
// Component
// ============================================================================

export const SecurityEventsTable = ({
  data,
  isLoading,
  pagination,
  onPageChange,
}: SecurityEventsTableProps): JSX.Element => {
  const navigate = useNavigate();

  const handleRowClick = (event: SecurityEventLocal): void => {
    navigate(`/admin/security/${event.id}`);
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
        <Text tone="muted">No security events found</Text>
      </div>
    );
  }

  if (data.data.length === 0) {
    return (
      <div className="text-center py-12">
        <Text tone="muted">No security events found</Text>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Time</TableHead>
            <TableHead>Event Type</TableHead>
            <TableHead>Severity</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>IP Address</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.data.map((event) => (
            <TableRow
              key={event.id}
              className="cursor-pointer hover-row"
              onClick={() => {
                handleRowClick(event);
              }}
            >
              <TableCell>
                <Text size="sm">{formatDate(event.createdAt)}</Text>
              </TableCell>
              <TableCell>
                <Text size="sm">{formatEventType(event.eventType)}</Text>
              </TableCell>
              <TableCell>
                <Badge tone={severityToTone(event.severity)}>{event.severity.toUpperCase()}</Badge>
              </TableCell>
              <TableCell>
                <Text size="sm">{event.email ?? '-'}</Text>
              </TableCell>
              <TableCell>
                <Text size="sm" className="font-mono">
                  {event.ipAddress ?? '-'}
                </Text>
              </TableCell>
              <TableCell>
                <Button
                  variant="secondary"
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRowClick(event);
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
          Showing {data.data.length} of {data.total} events
        </Text>
        <Pagination value={pagination.page} totalPages={data.totalPages} onChange={onPageChange} />
      </div>
    </div>
  );
};
