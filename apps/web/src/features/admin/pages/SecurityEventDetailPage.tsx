// apps/web/src/features/admin/pages/SecurityEventDetailPage.tsx
/**
 * SecurityEventDetailPage
 *
 * Admin page for viewing a single security event in detail.
 */

import { Button, Heading, PageContainer, Text, useNavigate, useParams } from '@abe-stack/ui';

import { SecurityEventCard } from '../components';
import { useSecurityEvent } from '../hooks';

import type { JSX } from 'react';

// ============================================================================
// Component
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

export const SecurityEventDetailPage = (): JSX.Element => {
  const params = useParams();
  const id = params['id'];
  const navigate = useNavigate();

  const eventResult = useSecurityEvent(id);
  const event = eventResult.data as SecurityEventLocal | undefined;
  const { isLoading, isError, error } = eventResult;

  const handleBack = (): void => {
    navigate('/admin/security');
  };

  return (
    <PageContainer>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button variant="secondary" onClick={handleBack}>
              Back to Events
            </Button>
            <div>
              <Heading as="h1" size="xl">
                Security Event
              </Heading>
              {event !== undefined && (
                <Text tone="muted" size="sm">
                  ID: {event.id}
                </Text>
              )}
            </div>
          </div>
        </div>

        {/* Error State */}
        {isError && (
          <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg p-4">
            <Heading as="h3" size="sm" className="mb-2">
              Error Loading Event
            </Heading>
            <Text>{error?.message ?? 'An unexpected error occurred'}</Text>
            <Button variant="secondary" onClick={handleBack} className="mt-4">
              Return to Events List
            </Button>
          </div>
        )}

        {/* Event Details */}
        {!isError && <SecurityEventCard event={event} isLoading={isLoading} />}
      </div>
    </PageContainer>
  );
};
