// main/apps/web/src/features/admin/components/SecurityEventCard.tsx
/**
 * SecurityEventCard Component
 *
 * Displays detailed information about a single security event.
 */

import { formatDateTime, formatSecurityEventType, getSecuritySeverityTone } from '@bslt/shared';
import { Badge, Text } from '@bslt/ui';
import { LabeledValueRow } from '@bslt/ui/components/LabeledValueRow';
import { TitledCardSection } from '@bslt/ui/components/TitledCardSection';

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
  event: SecurityEventLocal | undefined,
): event is SecurityEventLocal & { metadata: Record<string, unknown> } {
  return (
    event?.metadata !== undefined &&
    event.metadata !== null &&
    Object.keys(event.metadata).length > 0
  );
}

// ============================================================================
// Component
// ============================================================================

export const SecurityEventCard = ({ event, isLoading }: SecurityEventCardProps): JSX.Element => {
  return (
    <div className="space-y-6">
      <TitledCardSection title="Event Details" headingAs="h2" headingSize="lg" cardClassName="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
          <LabeledValueRow
            label="Event ID"
            value={event?.id}
            isLoading={isLoading}
            className="py-2 border-b last:border-b-0"
            labelClassName="font-medium"
          />
          <LabeledValueRow
            label="Created At"
            value={event !== undefined ? formatDateTime(event.createdAt) : undefined}
            isLoading={isLoading}
            className="py-2 border-b last:border-b-0"
            labelClassName="font-medium"
          />
          <LabeledValueRow
            label="Event Type"
            value={event !== undefined ? formatSecurityEventType(event.eventType) : undefined}
            isLoading={isLoading}
            className="py-2 border-b last:border-b-0"
            labelClassName="font-medium"
          />
          <LabeledValueRow
            label="Severity"
            value={
              event !== undefined ? (
                <Badge tone={getSecuritySeverityTone(event.severity)}>
                  {event.severity.toUpperCase()}
                </Badge>
              ) : undefined
            }
            isLoading={isLoading}
            className="py-2 border-b last:border-b-0"
            labelClassName="font-medium"
          />
        </div>
      </TitledCardSection>

      <TitledCardSection
        title="User Information"
        headingAs="h3"
        headingSize="md"
        cardClassName="p-6"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
          <LabeledValueRow
            label="User ID"
            value={event?.userId}
            isLoading={isLoading}
            className="py-2 border-b last:border-b-0"
            labelClassName="font-medium"
          />
          <LabeledValueRow
            label="Email"
            value={event?.email}
            isLoading={isLoading}
            className="py-2 border-b last:border-b-0"
            labelClassName="font-medium"
          />
        </div>
      </TitledCardSection>

      <TitledCardSection
        title="Request Information"
        headingAs="h3"
        headingSize="md"
        cardClassName="p-6"
      >
        <div className="grid grid-cols-1 gap-x-8">
          <LabeledValueRow
            label="IP Address"
            value={event?.ipAddress}
            isLoading={isLoading}
            className="py-2 border-b last:border-b-0"
            labelClassName="font-medium"
          />
          <LabeledValueRow
            label="User Agent"
            value={
              event !== undefined && event.userAgent !== null && event.userAgent !== '' ? (
                <Text className="break-all font-mono text-sm">{event.userAgent}</Text>
              ) : undefined
            }
            isLoading={isLoading}
            className="py-2 border-b last:border-b-0"
            labelClassName="font-medium"
          />
        </div>
      </TitledCardSection>

      {hasValidMetadata(event) && (
        <TitledCardSection
          title="Additional Metadata"
          headingAs="h3"
          headingSize="md"
          cardClassName="p-6"
        >
          <div className="bg-surface rounded-lg p-4 overflow-auto">
            <pre className="text-sm font-mono">{JSON.stringify(event.metadata, null, 2)}</pre>
          </div>
        </TitledCardSection>
      )}
    </div>
  );
};
