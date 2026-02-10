// src/apps/web/src/features/settings/components/ProfileCompleteness.tsx
/**
 * Profile Completeness Component
 *
 * Displays a progress bar showing profile completion percentage
 * and lists missing fields.
 */

import { Progress, Text } from '@abe-stack/ui';

import { useProfileCompleteness } from '../hooks/useProfileCompleteness';

import type { ReactElement } from 'react';

// ============================================================================
// Types
// ============================================================================

export interface ProfileCompletenessProps {
  className?: string;
}

// ============================================================================
// Helpers
// ============================================================================

/** Convert camelCase field names to readable labels */
function formatFieldName(field: string): string {
  return field
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (s) => s.toUpperCase())
    .trim();
}

// ============================================================================
// Component
// ============================================================================

export const ProfileCompleteness = ({
  className,
}: ProfileCompletenessProps): ReactElement | null => {
  const { data, isLoading, isError } = useProfileCompleteness();

  if (isLoading || isError || data === null) return null;

  // Don't show if profile is already complete
  if (data.percentage >= 100) return null;

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-2">
        <Text size="sm" className="font-medium">
          Profile Completeness
        </Text>
        <Text size="sm" tone="muted">
          {String(data.percentage)}%
        </Text>
      </div>
      <Progress value={data.percentage} />
      {data.missingFields.length > 0 && (
        <Text size="sm" tone="muted" className="mt-2">
          Missing: {data.missingFields.map(formatFieldName).join(', ')}
        </Text>
      )}
    </div>
  );
};
