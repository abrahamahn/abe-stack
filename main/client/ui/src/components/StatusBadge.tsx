// main/client/ui/src/components/StatusBadge.tsx
import { getUserStatusLabel, getUserStatusTone } from '@abe-stack/shared';

import { Badge } from '../elements/Badge';

import type { UserStatus } from '@abe-stack/shared';
import type { ReactElement } from 'react';

interface AdminUserLocal {
  lockedUntil: string | null;
  emailVerified: boolean;
}

export interface StatusBadgeProps {
  status: UserStatus;
}

export function getUserStatus(user: AdminUserLocal): UserStatus {
  const now = new Date();

  if (
    user.lockedUntil !== null &&
    user.lockedUntil.length > 0 &&
    new Date(user.lockedUntil) > now
  ) {
    return 'locked';
  }

  if (!user.emailVerified) {
    return 'unverified';
  }

  return 'active';
}

export const StatusBadge = ({ status }: StatusBadgeProps): ReactElement => {
  return <Badge tone={getUserStatusTone(status)}>{getUserStatusLabel(status)}</Badge>;
};
