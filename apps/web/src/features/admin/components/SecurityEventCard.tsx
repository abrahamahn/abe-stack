// apps/web/src/features/admin/components/SecurityEventCard.tsx
/**
 * SecurityEventCard Component
 *
 * Displays detailed information about a single security event.
 */

import { Card, Heading, Skeleton, Text } from '@abe-stack/ui';

import type { JSX } from 'react';

// ============================================================================
// Types
// ============================================================================

interface SecurityEventLocal {
  id: string;
  createdAt: string;
  eventType: string;
  severity: string;
  userId?: string | null;
  email?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface SecurityEventCardProps {
  event: SecurityEventLocal | undefined;
  isLoading: boolean;
}

// ============================================================================
// Type Guards
// ============================================================================

function hasValidMetadata(
  event: SecurityEventLocal | undefined
): event is SecurityEventLocal & { metadata: Record<string, unknown> } {
  return (
    event?.metadata !== undefined &&
    event.metadata !== null &&
    Object.keys(event.metadata).length > 0
  );
}

// ============================================================================
// Helper Functions
// ============================================================================

function getSeverityBadgeClass(severity: string): string {
  switch (severity) {
    case 'critical':
      return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
    case 'high':
      return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
    case 'medium':
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
    case 'low':
      return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
  }
}

function formatEventType(eventType: string): string {
  return eventType.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleString();
}

// ============================================================================
// Helper Components
// ============================================================================

interface DetailRowProps {
  label: string;
  value: string | JSX.Element | null | undefined;
  isLoading: boolean;
}

const DetailRow = ({ label, value, isLoading }: DetailRowProps): JSX.Element => {
  if (isLoading) {
    return (
      <div className="flex flex-col gap-1 py-2 border-b border-gray-100 dark:border-gray-700">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-5 w-48" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1 py-2 border-b border-gray-100 dark:border-gray-700 last:border-b-0">
      <Text tone="muted" size="sm" className="font-medium">
        {label}
      </Text>
      <Text>{value ?? '-'}</Text>
    </div>
  );
};

// ============================================================================
// Component
// ============================================================================

export const SecurityEventCard = ({ event, isLoading }: SecurityEventCardProps): JSX.Element => {
  return (
    <div className="space-y-6">
      <Card className="p-6">
        <Heading as="h2" size="lg" className="mb-4">
          Event Details
        </Heading>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
          <DetailRow label="Event ID" value={event?.id} isLoading={isLoading} />
          <DetailRow
            label="Created At"
            value={event !== undefined ? formatDate(event.createdAt) : undefined}
            isLoading={isLoading}
          />
          <DetailRow
            label="Event Type"
            value={event !== undefined ? formatEventType(event.eventType) : undefined}
            isLoading={isLoading}
          />
          <DetailRow
            label="Severity"
            value={
              event !== undefined ? (
                <span
                  className={`px-2 py-1 rounded-full text-xs font-medium ${getSeverityBadgeClass(event.severity)}`}
                >
                  {event.severity.toUpperCase()}
                </span>
              ) : undefined
            }
            isLoading={isLoading}
          />
        </div>
      </Card>

      <Card className="p-6">
        <Heading as="h3" size="md" className="mb-4">
          User Information
        </Heading>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
          <DetailRow label="User ID" value={event?.userId} isLoading={isLoading} />
          <DetailRow label="Email" value={event?.email} isLoading={isLoading} />
        </div>
      </Card>

      <Card className="p-6">
        <Heading as="h3" size="md" className="mb-4">
          Request Information
        </Heading>

        <div className="grid grid-cols-1 gap-x-8">
          <DetailRow label="IP Address" value={event?.ipAddress} isLoading={isLoading} />
          <DetailRow
            label="User Agent"
            value={
              event !== undefined && event.userAgent !== null && event.userAgent !== '' ? (
                <Text className="break-all font-mono text-sm">{event.userAgent}</Text>
              ) : undefined
            }
            isLoading={isLoading}
          />
        </div>
      </Card>

      {hasValidMetadata(event) && (
        <Card className="p-6">
          <Heading as="h3" size="md" className="mb-4">
            Additional Metadata
          </Heading>

          <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 overflow-auto">
            <pre className="text-sm font-mono">{JSON.stringify(event.metadata, null, 2)}</pre>
          </div>
        </Card>
      )}
    </div>
  );
};
