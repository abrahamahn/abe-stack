// src/apps/web/src/features/activities/components/ActivityFeed.tsx
/**
 * ActivityFeed
 *
 * A timeline component that displays recent user activities.
 */

import { formatTimeAgo, getActorTypeTone } from '@abe-stack/shared';
import { Alert, Badge, EmptyState, Skeleton, Text } from '@abe-stack/ui';

import { useActivities } from '../hooks';

import type { ActivityLocal } from '../api';
import type { ReactElement } from 'react';

// ============================================================================
// Types
// ============================================================================

export interface ActivityFeedProps {
  limit?: number;
  className?: string;
}

// ============================================================================
// Helpers
// ============================================================================

function ActivityItem({ activity }: { activity: ActivityLocal }): ReactElement {
  const actorTone = getActorTypeTone(activity.actorType);

  return (
    <div className="flex items-start gap-3 py-3 border-b border-border last:border-b-0">
      <div className="flex-shrink-0 mt-0.5">
        <Badge tone={actorTone}>{activity.actorType}</Badge>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <Text size="sm" className="font-medium">
            {activity.action}
          </Text>
          <Text size="sm" tone="muted">
            {activity.resourceType}
            {activity.resourceId !== '' ? ` #${activity.resourceId.slice(0, 8)}` : ''}
          </Text>
        </div>
        {activity.description !== null && (
          <Text size="sm" tone="muted" className="mt-0.5">
            {activity.description}
          </Text>
        )}
      </div>
      <Text size="sm" tone="muted" className="flex-shrink-0">
        {formatTimeAgo(activity.createdAt)}
      </Text>
    </div>
  );
}

// ============================================================================
// Component
// ============================================================================

export function ActivityFeed({ limit = 20, className }: ActivityFeedProps): ReactElement {
  const { activities, isLoading, isError, error } = useActivities({ limit });

  if (isLoading) {
    return (
      <div className={className}>
        <div className="space-y-3">
          {Array.from({ length: 3 }, (_, i) => (
            <div key={i} className="flex items-start gap-3 py-3">
              <Skeleton className="h-6 w-16 flex-shrink-0" />
              <div className="flex-1 space-y-1">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
              <Skeleton className="h-3 w-12 flex-shrink-0" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className={className}>
        <Alert tone="danger">{error?.message ?? 'Failed to load activities'}</Alert>
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className={className}>
        <EmptyState
          title="No recent activity"
          description="Your recent actions will appear here"
        />
      </div>
    );
  }

  return (
    <div className={className}>
      {activities.map((activity) => (
        <ActivityItem key={activity.id} activity={activity} />
      ))}
    </div>
  );
}
