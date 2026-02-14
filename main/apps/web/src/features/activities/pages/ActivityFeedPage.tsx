// main/apps/web/src/features/activities/pages/ActivityFeedPage.tsx
/**
 * Activity Feed Page
 *
 * Full-page activity feed showing the authenticated user's recent actions.
 */

import { Card, Heading, PageContainer, Text } from '@abe-stack/ui';

import { ActivityFeed } from '../components/ActivityFeed';

import type { ReactElement } from 'react';

// ============================================================================
// Component
// ============================================================================

export function ActivityFeedPage(): ReactElement {
  return (
    <PageContainer>
      <section className="mb-4">
        <Heading as="h1" size="xl">
          Activity Feed
        </Heading>
        <Text tone="muted" className="mt-1">
          A timeline of your recent actions and events.
        </Text>
      </section>

      <Card>
        <ActivityFeed limit={50} />
      </Card>
    </PageContainer>
  );
}
