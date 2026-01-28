// apps/web/src/features/admin/components/JobStatusBadge.tsx
/**
 * JobStatusBadge component
 *
 * Displays a colored badge for job status.
 */

import { Badge } from '@abe-stack/ui';

import type { JSX } from 'react';

// ============================================================================
// Types
// ============================================================================

type JobStatusLocal = 'pending' | 'processing' | 'completed' | 'failed' | 'dead_letter' | 'cancelled';

export interface JobStatusBadgeProps {
  status: JobStatusLocal;
}

// ============================================================================
// Status Configuration
// ============================================================================

const STATUS_CONFIG: Record<
  JobStatusLocal,
  { tone: 'info' | 'success' | 'danger' | 'warning'; label: string }
> = {
  pending: { tone: 'info', label: 'Pending' },
  processing: { tone: 'warning', label: 'Processing' },
  completed: { tone: 'success', label: 'Completed' },
  failed: { tone: 'danger', label: 'Failed' },
  ['dead_letter']: { tone: 'danger', label: 'Dead Letter' },
  cancelled: { tone: 'warning', label: 'Cancelled' },
};

// ============================================================================
// Component
// ============================================================================

export const JobStatusBadge = ({ status }: JobStatusBadgeProps): JSX.Element => {
  const config = STATUS_CONFIG[status];

  return <Badge tone={config.tone}>{config.label}</Badge>;
};
