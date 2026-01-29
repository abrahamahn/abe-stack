// apps/web/src/features/admin/components/SecurityEventsFilters.tsx
/**
 * SecurityEventsFilters Component
 *
 * Filter controls for security events list.
 */

import {
  SECURITY_EVENT_TYPES,
  SECURITY_SEVERITIES,
  type SecurityEventsFilter,
} from '@abe-stack/core';
import { Button, Input, Select } from '@abe-stack/ui';
import { useCallback, useEffect, useState } from 'react';

import type { JSX } from 'react';

// ============================================================================
// Types
// ============================================================================

export interface SecurityEventsFiltersProps {
  filter: SecurityEventsFilter;
  onFilterChange: (filter: SecurityEventsFilter) => void;
}

// ============================================================================
// Component
// ============================================================================

export const SecurityEventsFilters = ({
  filter,
  onFilterChange,
}: SecurityEventsFiltersProps): JSX.Element => {
  const [localFilter, setLocalFilter] = useState<SecurityEventsFilter>(filter);

  // Sync local filter with prop changes
  useEffect(() => {
    setLocalFilter(filter);
  }, [filter]);

  const handleInputChange = useCallback((field: keyof SecurityEventsFilter, value: string) => {
    setLocalFilter((prev) => ({
      ...prev,
      [field]: value !== '' ? value : undefined,
    }));
  }, []);

  const handleApply = useCallback(() => {
    onFilterChange(localFilter);
  }, [localFilter, onFilterChange]);

  const handleClear = useCallback(() => {
    const emptyFilter: SecurityEventsFilter = {};
    setLocalFilter(emptyFilter);
    onFilterChange(emptyFilter);
  }, [onFilterChange]);

  const eventTypeOptions = [
    { value: '', label: 'All Event Types' },
    ...SECURITY_EVENT_TYPES.map((type) => ({
      value: type,
      label: type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
    })),
  ];

  const severityOptions = [
    { value: '', label: 'All Severities' },
    ...SECURITY_SEVERITIES.map((severity) => ({
      value: severity,
      label: severity.charAt(0).toUpperCase() + severity.slice(1),
    })),
  ];

  return (
    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        <div>
          <label
            htmlFor="event-type-select"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
          >
            Event Type
          </label>
          <Select
            id="event-type-select"
            value={localFilter.eventType ?? ''}
            onChange={(value) => {
              handleInputChange('eventType', value);
            }}
          >
            {eventTypeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </div>

        <div>
          <label
            htmlFor="severity-select"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
          >
            Severity
          </label>
          <Select
            id="severity-select"
            value={localFilter.severity ?? ''}
            onChange={(value) => {
              handleInputChange('severity', value);
            }}
          >
            {severityOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </div>

        <div>
          <label
            htmlFor="email-input"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
          >
            Email
          </label>
          <Input
            id="email-input"
            type="email"
            placeholder="Search by email..."
            value={localFilter.email ?? ''}
            onChange={(e) => {
              handleInputChange('email', e.target.value);
            }}
          />
        </div>

        <div>
          <label
            htmlFor="ip-address-input"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
          >
            IP Address
          </label>
          <Input
            id="ip-address-input"
            type="text"
            placeholder="Filter by IP..."
            value={localFilter.ipAddress ?? ''}
            onChange={(e) => {
              handleInputChange('ipAddress', e.target.value);
            }}
          />
        </div>

        <div>
          <label
            htmlFor="start-date-input"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
          >
            Start Date
          </label>
          <Input
            id="start-date-input"
            type="datetime-local"
            value={localFilter.startDate ?? ''}
            onChange={(e) => {
              handleInputChange('startDate', e.target.value);
            }}
          />
        </div>

        <div>
          <label
            htmlFor="end-date-input"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
          >
            End Date
          </label>
          <Input
            id="end-date-input"
            type="datetime-local"
            value={localFilter.endDate ?? ''}
            onChange={(e) => {
              handleInputChange('endDate', e.target.value);
            }}
          />
        </div>

        <div>
          <label
            htmlFor="user-id-input"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
          >
            User ID
          </label>
          <Input
            id="user-id-input"
            type="text"
            placeholder="Filter by User ID..."
            value={localFilter.userId ?? ''}
            onChange={(e) => {
              handleInputChange('userId', e.target.value);
            }}
          />
        </div>

        <div className="flex items-end gap-2">
          <Button onClick={handleApply}>Apply Filters</Button>
          <Button variant="secondary" onClick={handleClear}>
            Clear
          </Button>
        </div>
      </div>
    </div>
  );
};
