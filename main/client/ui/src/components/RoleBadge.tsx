// main/client/ui/src/components/RoleBadge.tsx
import { getAppRoleLabel, getAppRoleTone } from '@bslt/shared';

import { Badge } from '../elements/Badge';

import type { ReactElement } from 'react';

export interface RoleBadgeProps {
  role: string;
}

export const RoleBadge = ({ role }: RoleBadgeProps): ReactElement => {
  return <Badge tone={getAppRoleTone(role)}>{getAppRoleLabel(role)}</Badge>;
};
