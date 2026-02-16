// main/apps/web/src/features/settings/components/ProfileCompleteness.tsx
import { ProfileCompletenessCard } from '@abe-stack/ui/components/ProfileCompletenessCard';

import { useProfileCompleteness } from '../hooks/useProfileCompleteness';

import type { ReactElement } from 'react';

export interface ProfileCompletenessProps {
  className?: string;
}

export const ProfileCompleteness = ({
  className,
}: ProfileCompletenessProps): ReactElement | null => {
  const { data, isLoading, isError } = useProfileCompleteness();

  if (isLoading || isError || data === null) return null;

  return (
    <ProfileCompletenessCard
      percentage={data.percentage}
      missingFields={data.missingFields}
      {...(className !== undefined ? { className } : {})}
    />
  );
};
