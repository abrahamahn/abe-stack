// main/apps/web/src/features/admin/components/RecentErrorLogWidget.tsx
/**
 * RecentErrorLogWidget Component
 *
 * Displays the last N errors with details. For use on the system health dashboard.
 */

import { formatDateTime } from '@bslt/shared';
import {
  Alert,
  Badge,
  Button,
  Card,
  Heading,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Text,
} from '@bslt/ui';
import { useCallback, useState } from 'react';

import type { AdminErrorLogEntry } from '../services/adminApi';
import type { ReactElement } from 'react';

// ============================================================================
// Types
// ============================================================================

export interface RecentErrorLogWidgetProps {
  errors: AdminErrorLogEntry[] | undefined;
  total: number;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
}

// ============================================================================
// Severity Badge
// ============================================================================

function SeverityBadge({ severity }: { severity: string }): ReactElement {
  const toneMap: Record<string, 'danger' | 'warning' | 'info'> = {
    critical: 'danger',
    error: 'danger',
    warning: 'warning',
  };
  const tone = toneMap[severity] ?? 'info';
  return <Badge tone={tone}>{severity}</Badge>;
}

// ============================================================================
// Error Detail
// ============================================================================

function ErrorDetail({
  entry,
  onClose,
}: {
  entry: AdminErrorLogEntry;
  onClose: () => void;
}): ReactElement {
  return (
    <div className="mt-2 p-3 bg-surface rounded border border-border text-sm">
      <div className="flex items-center justify-between mb-2">
        <Text size="sm" className="font-medium">
          Error Details
        </Text>
        <Button
          variant="text"
          size="small"
          onClick={onClose}
          className="text-xs text-muted hover:text-text cursor-pointer"
        >
          Close
        </Button>
      </div>
      <div className="space-y-2">
        <div>
          <Text size="sm" tone="muted">
            Source:
          </Text>
          <Text size="sm" className="font-mono">
            {entry.source}
          </Text>
        </div>
        <div>
          <Text size="sm" tone="muted">
            Message:
          </Text>
          <Text size="sm">{entry.message}</Text>
        </div>
        {entry.stack !== null && (
          <div>
            <Text size="sm" tone="muted">
              Stack Trace:
            </Text>
            <pre className="text-xs overflow-auto max-h-40 p-2 bg-surface rounded font-mono">
              {entry.stack}
            </pre>
          </div>
        )}
        {Object.keys(entry.metadata).length > 0 && (
          <div>
            <Text size="sm" tone="muted">
              Metadata:
            </Text>
            <pre className="text-xs overflow-auto max-h-20 p-2 bg-surface rounded font-mono">
              {JSON.stringify(entry.metadata, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Component
// ============================================================================

export function RecentErrorLogWidget({
  errors,
  total,
  isLoading,
  isError,
  error,
}: RecentErrorLogWidgetProps): ReactElement {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const handleToggle = useCallback((id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  }, []);

  if (isLoading) {
    return (
      <Card className="p-4">
        <Skeleton width="10rem" height="1.25rem" className="mb-4" />
        <div className="space-y-2">
          <Skeleton width="100%" height="2rem" />
          <Skeleton width="100%" height="2rem" />
          <Skeleton width="100%" height="2rem" />
        </div>
      </Card>
    );
  }

  if (isError) {
    return (
      <Card className="p-4">
        <Heading as="h3" size="sm" className="mb-2">
          Recent Errors
        </Heading>
        <Alert tone="danger">{error?.message ?? 'Failed to load error log'}</Alert>
      </Card>
    );
  }

  const entries = errors ?? [];

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-4">
        <Heading as="h3" size="sm">
          Recent Errors
        </Heading>
        {total > 0 && <Badge tone="danger">{total} total</Badge>}
      </div>

      {entries.length === 0 ? (
        <Text tone="muted" size="sm">
          No recent errors. All systems operating normally.
        </Text>
      ) : (
        <div className="overflow-auto max-h-96">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Severity</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Message</TableHead>
                <TableHead>Time</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.map((entry: AdminErrorLogEntry) => (
                <TableRow
                  key={entry.id}
                  className="cursor-pointer hover:bg-surface"
                  onClick={() => {
                    handleToggle(entry.id);
                  }}
                >
                  <TableCell>
                    <SeverityBadge severity={entry.severity} />
                  </TableCell>
                  <TableCell>
                    <Text size="sm" className="font-mono">
                      {entry.source}
                    </Text>
                  </TableCell>
                  <TableCell>
                    <Text size="sm" className="truncate max-w-xs">
                      {entry.message}
                    </Text>
                    {expandedId === entry.id && (
                      <ErrorDetail
                        entry={entry}
                        onClose={() => {
                          setExpandedId(null);
                        }}
                      />
                    )}
                  </TableCell>
                  <TableCell>
                    <Text size="sm">{formatDateTime(entry.occurredAt)}</Text>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </Card>
  );
}
