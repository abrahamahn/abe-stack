// main/apps/web/src/features/admin/components/WebhookStatusBadge.tsx
/**
 * WebhookStatusBadge
 *
 * Displays the status of a webhook registration as a styled badge.
 * Supports active, inactive, and failing states.
 */

import { Badge } from '@bslt/ui';

import type { ReactElement } from 'react';

// ============================================================================
// Types
// ============================================================================

export type WebhookStatus = 'active' | 'inactive' | 'failing';

export interface WebhookStatusBadgeProps {
  status: WebhookStatus;
}

// ============================================================================
// Status Configuration
// ============================================================================

const STATUS_CONFIG: Record<
  WebhookStatus,
  { label: string; tone: 'success' | 'warning' | 'danger' }
> = {
  active: { label: 'Active', tone: 'success' },
  inactive: { label: 'Inactive', tone: 'warning' },
  failing: { label: 'Failing', tone: 'danger' },
};

// ============================================================================
// Component
// ============================================================================

export function WebhookStatusBadge({ status }: WebhookStatusBadgeProps): ReactElement {
  const config = STATUS_CONFIG[status];
  return <Badge tone={config.tone}>{config.label}</Badge>;
}
