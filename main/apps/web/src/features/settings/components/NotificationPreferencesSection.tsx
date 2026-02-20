// main/apps/web/src/features/settings/components/NotificationPreferencesSection.tsx
/**
 * Notification Preferences Section
 *
 * Provides a summary of notification preferences and a link to the
 * full notification preference center. Designed for the main settings page
 * where we show a compact view with a "Manage Notifications" button.
 */

import { useNavigate } from '@bslt/react/router';
import { Button, Card, Heading, Text } from '@bslt/ui';

import type { ReactElement } from 'react';

// ============================================================================
// Types
// ============================================================================

export interface NotificationPreferencesSectionProps {
  /** URL to the full notification preferences page (default: "/settings/notifications") */
  preferenceCenterUrl?: string;
  className?: string;
}

// ============================================================================
// Component
// ============================================================================

export const NotificationPreferencesSection = ({
  preferenceCenterUrl = '/settings/notifications',
  className,
}: NotificationPreferencesSectionProps): ReactElement => {
  const navigate = useNavigate();

  return (
    <Card className={className}>
      <Card.Body>
        <div className="space-y-4">
          <div>
            <Heading as="h4" size="sm" className="mb-2">
              Notifications
            </Heading>
            <Text size="sm" tone="muted">
              Control which notifications you receive, how they are delivered, and configure quiet
              hours to pause notifications during specific times.
            </Text>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-primary" />
              <Text size="sm">Push, email, and in-app notification channels</Text>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-primary" />
              <Text size="sm">Per-type toggles (system, security, social, marketing)</Text>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-primary" />
              <Text size="sm">Quiet hours scheduling</Text>
            </div>
          </div>

          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              navigate(preferenceCenterUrl);
            }}
            data-testid="manage-notifications-button"
          >
            Manage Notifications
          </Button>
        </div>
      </Card.Body>
    </Card>
  );
};
