// src/apps/web/src/features/admin/components/JobStatusBadge.tsx
/**
 * JobStatusBadge component
 *
 * Displays a colored badge for job status.
 */

import { getJobStatusLabel, getJobStatusTone } from '@abe-stack/shared';
import { Badge } from '@abe-stack/ui';

import type { JobStatus } from '@abe-stack/shared';
import type { JSX } from 'react';

// ============================================================================
// Types
// ============================================================================

export interface JobStatusBadgeProps {
  status: JobStatus;
}

// ============================================================================
// Component
// ============================================================================

export const JobStatusBadge = ({ status }: JobStatusBadgeProps): JSX.Element => {
  return <Badge tone={getJobStatusTone(status)}>{getJobStatusLabel(status)}</Badge>;
};
