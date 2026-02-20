// main/apps/web/src/features/admin/components/HealthStatusCard.tsx
/**
 * HealthStatusCard Component
 *
 * Displays the health status of a single service with green/yellow/red indicator.
 */

import { Card, Text } from '@bslt/ui';

import type { ServiceStatus } from '../services/adminApi';
import type { ReactElement } from 'react';

// ============================================================================
// Types
// ============================================================================

export interface HealthStatusCardProps {
  serviceName: string;
  status: ServiceStatus;
}

// ============================================================================
// Helpers
// ============================================================================

function getStatusColor(status: ServiceStatus): string {
  switch (status) {
    case 'up':
      return '#22c55e'; // green-500
    case 'down':
      return '#ef4444'; // red-500
    case 'unknown':
    default:
      return '#eab308'; // yellow-500
  }
}

function getStatusLabel(status: ServiceStatus): string {
  switch (status) {
    case 'up':
      return 'Operational';
    case 'down':
      return 'Down';
    case 'unknown':
    default:
      return 'Unknown';
  }
}

function getStatusBgClass(status: ServiceStatus): string {
  switch (status) {
    case 'up':
      return 'bg-green-50 dark:bg-green-950';
    case 'down':
      return 'bg-red-50 dark:bg-red-950';
    case 'unknown':
    default:
      return 'bg-yellow-50 dark:bg-yellow-950';
  }
}

// ============================================================================
// Component
// ============================================================================

export function HealthStatusCard({ serviceName, status }: HealthStatusCardProps): ReactElement {
  return (
    <Card className={`p-4 ${getStatusBgClass(status)}`}>
      <div className="flex items-center gap-3">
        <div
          className="w-3 h-3 rounded-full flex-shrink-0"
          style={{ backgroundColor: getStatusColor(status) }}
          aria-label={`${serviceName}: ${getStatusLabel(status)}`}
        />
        <div className="flex-1 min-w-0">
          <Text size="sm" className="font-medium capitalize">
            {serviceName}
          </Text>
          <Text size="sm" tone="muted">
            {getStatusLabel(status)}
          </Text>
        </div>
      </div>
    </Card>
  );
}
