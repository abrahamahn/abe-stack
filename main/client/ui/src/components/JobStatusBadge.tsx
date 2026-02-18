// main/client/ui/src/components/JobStatusBadge.tsx
import { getJobStatusLabel, getJobStatusTone } from '@bslt/shared';

import { Badge } from '../elements/Badge';

import type { JobStatus } from '@bslt/shared';
import type { ReactElement } from 'react';

export interface JobStatusBadgeProps {
  status: JobStatus;
}

export const JobStatusBadge = ({ status }: JobStatusBadgeProps): ReactElement => {
  return <Badge tone={getJobStatusTone(status)}>{getJobStatusLabel(status)}</Badge>;
};
