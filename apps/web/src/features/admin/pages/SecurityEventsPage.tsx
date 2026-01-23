// apps/web/src/features/admin/pages/SecurityEventsPage.tsx
/**
 * SecurityEventsPage
 *
 * Admin page for viewing and filtering security events.
 */

import { Button, Heading, PageContainer, Select, Text } from '@abe-stack/ui';
import { useState, useCallback } from 'react';

import {
  ExportDialog,
  SecurityEventsFilters,
  SecurityEventsTable,
  SecurityMetricsCard,
} from '../components';
import { useSecurityEvents, useSecurityMetrics } from '../hooks';

import type { MetricsPeriod } from '../hooks';
import type { JSX } from 'react';

// ============================================================================
// Component
// ============================================================================

export function SecurityEventsPage(): JSX.Element {
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const {
    data: eventsData,
    isLoading: eventsLoading,
    filter,
    pagination,
    setFilter,
    setPage,
    refetch: refetchEvents,
  } = useSecurityEvents();

  const {
    data: metricsData,
    isLoading: metricsLoading,
    period,
    setPeriod,
  } = useSecurityMetrics();

  const handlePeriodChange = useCallback(
    (value: string) => {
      setPeriod(value as MetricsPeriod);
    },
    [setPeriod],
  );

  const periodOptions = [
    { value: 'hour', label: 'Last Hour' },
    { value: 'day', label: 'Last 24 Hours' },
    { value: 'week', label: 'Last 7 Days' },
    { value: 'month', label: 'Last 30 Days' },
  ];

  return (
    <PageContainer>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <Heading as="h1" size="xl">
              Security Events
            </Heading>
            <Text tone="muted">
              Monitor and audit security-related events across your application.
            </Text>
          </div>
          <div className="flex items-center gap-2">
            <Select
              value={period}
              onChange={handlePeriodChange}
              className="w-40"
            >
              {periodOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
            <Button variant="secondary" onClick={() => { void refetchEvents(); }}>
              Refresh
            </Button>
            <Button onClick={() => { setIsExportDialogOpen(true); }}>
              Export
            </Button>
          </div>
        </div>

        {/* Metrics */}
        <SecurityMetricsCard metrics={metricsData} isLoading={metricsLoading} />

        {/* Filters Toggle */}
        <div className="flex items-center justify-between">
          <Button
            variant="secondary"
            onClick={() => { setShowFilters(!showFilters); }}
          >
            {showFilters ? 'Hide Filters' : 'Show Filters'}
          </Button>
          {Object.keys(filter).length > 0 && (
            <Text tone="muted" size="sm">
              {Object.keys(filter).length} filter(s) active
            </Text>
          )}
        </div>

        {/* Filters */}
        {showFilters && (
          <SecurityEventsFilters filter={filter} onFilterChange={setFilter} />
        )}

        {/* Events Table */}
        <SecurityEventsTable
          data={eventsData}
          isLoading={eventsLoading}
          pagination={pagination}
          onPageChange={setPage}
        />

        {/* Export Dialog */}
        <ExportDialog
          isOpen={isExportDialogOpen}
          onClose={() => { setIsExportDialogOpen(false); }}
          filter={filter}
        />
      </div>
    </PageContainer>
  );
}
