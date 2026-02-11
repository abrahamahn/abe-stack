// src/apps/web/src/features/admin/pages/AuditEventsPage.tsx
/**
 * AuditEventsPage
 *
 * Admin page for viewing system-wide audit events.
 * Supports filtering by action, actor, and tenant.
 */

import {
  Badge,
  Button,
  Heading,
  Input,
  PageContainer,
  Select,
  Spinner,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Text,
} from '@abe-stack/ui';
import { useCallback, useState } from 'react';

import { useAuditEvents } from '../hooks/useAuditEvents';

import type { AuditEventLocal, AuditEventsFilterLocal } from '../services/adminApi';
import type { ReactElement } from 'react';

// ============================================================================
// Constants
// ============================================================================

const SEVERITY_TONES: Record<string, 'info' | 'warning' | 'danger' | 'success'> = {
  info: 'info',
  warn: 'warning',
  error: 'danger',
  critical: 'danger',
};

const CATEGORIES = ['', 'security', 'admin', 'system', 'billing'] as const;
const LIMITS = [50, 100, 200, 500] as const;

// ============================================================================
// Helpers
// ============================================================================

function formatDateTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

function truncate(value: string, max: number): string {
  return value.length > max ? value.slice(0, max) + '...' : value;
}

// ============================================================================
// Component
// ============================================================================

export function AuditEventsPage(): ReactElement {
  const [actionFilter, setActionFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [limit, setLimit] = useState(100);

  const filter: AuditEventsFilterLocal = {};
  if (actionFilter !== '') {
    filter.action = actionFilter;
  }
  if (limit !== 100) {
    filter.limit = limit;
  }

  const { data, isLoading, isError, error, refetch } = useAuditEvents({ filter });

  const handleRefresh = useCallback(() => {
    void refetch();
  }, [refetch]);

  if (isLoading) {
    return (
      <PageContainer>
        <div className="flex items-center justify-center p-12">
          <Spinner />
        </div>
      </PageContainer>
    );
  }

  if (isError) {
    return (
      <PageContainer>
        <Heading as="h1">Audit Log</Heading>
        <Text tone="danger">{error?.message ?? 'Failed to load audit events'}</Text>
      </PageContainer>
    );
  }

  const events = data?.events ?? [];

  return (
    <PageContainer>
      <div className="flex items-center justify-between mb-4">
        <div>
          <Heading as="h1">Audit Log</Heading>
          <Text tone="muted">{events.length} events</Text>
        </div>
        <Button type="button" variant="secondary" size="small" onClick={handleRefresh}>
          Refresh
        </Button>
      </div>

      <div className="flex gap-3 mb-4 flex-wrap items-end">
        <div className="flex flex-col gap-1">
          <Text as="label" size="sm" tone="muted">
            Action
          </Text>
          <Input
            placeholder="Filter by action..."
            value={actionFilter}
            onChange={(e: { target: { value: string } }) => {
              setActionFilter(e.target.value);
            }}
          />
        </div>
        <div className="flex flex-col gap-1">
          <Text as="label" size="sm" tone="muted">
            Category
          </Text>
          <Select
            value={categoryFilter}
            onChange={(value: string) => {
              setCategoryFilter(value);
            }}
          >
            <option value="">All Categories</option>
            {CATEGORIES.filter((c) => c !== '').map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
        </div>
        <div className="flex flex-col gap-1">
          <Text as="label" size="sm" tone="muted">
            Limit
          </Text>
          <Select
            value={String(limit)}
            onChange={(value: string) => {
              setLimit(Number(value));
            }}
          >
            {LIMITS.map((l) => (
              <option key={l} value={String(l)}>
                {l}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Time</TableHead>
            <TableHead>Action</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Severity</TableHead>
            <TableHead>Resource</TableHead>
            <TableHead>Actor</TableHead>
            <TableHead>IP</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredEvents(events, categoryFilter).map((event) => (
            <TableRow key={event.id} className="hover-row">
              <TableCell>
                <Text size="sm">{formatDateTime(event.createdAt)}</Text>
              </TableCell>
              <TableCell>
                <Text size="sm" className="font-mono">
                  {event.action}
                </Text>
              </TableCell>
              <TableCell>
                <Badge>{event.category}</Badge>
              </TableCell>
              <TableCell>
                <Badge tone={SEVERITY_TONES[event.severity] ?? 'info'}>{event.severity}</Badge>
              </TableCell>
              <TableCell>
                <Text size="sm">
                  {event.resource}
                  {event.resourceId !== null ? `:${truncate(event.resourceId, 8)}` : ''}
                </Text>
              </TableCell>
              <TableCell>
                <Text size="sm" className="font-mono">
                  {event.actorId !== null ? truncate(event.actorId, 8) : '-'}
                </Text>
              </TableCell>
              <TableCell>
                <Text size="sm">{event.ipAddress ?? '-'}</Text>
              </TableCell>
            </TableRow>
          ))}
          {filteredEvents(events, categoryFilter).length === 0 && (
            <TableRow>
              <TableCell>
                <Text tone="muted">No audit events found</Text>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </PageContainer>
  );
}

function filteredEvents(events: AuditEventLocal[], category: string): AuditEventLocal[] {
  if (category === '') return events;
  return events.filter((e) => e.category === category);
}
