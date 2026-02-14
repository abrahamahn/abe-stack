// main/client/ui/src/components/MetricValue.tsx
import { Skeleton } from '../elements/Skeleton';
import { Text } from '../elements/Text';
import { cn } from '../utils/cn';

import type { ReactElement } from 'react';

type TextTone = 'default' | 'muted' | 'danger' | 'success';
type TextSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

export interface MetricValueProps {
  label: string;
  value: number | string;
  isLoading?: boolean;
  labelTone?: TextTone;
  labelSize?: TextSize;
  valueTone?: TextTone;
  valueSize?: TextSize;
  formatNumber?: boolean;
  containerClassName?: string;
  labelClassName?: string;
  valueClassName?: string;
  labelSkeletonClassName?: string;
  valueSkeletonClassName?: string;
}

export const MetricValue = ({
  label,
  value,
  isLoading = false,
  labelTone = 'muted',
  labelSize = 'sm',
  valueTone = 'default',
  valueSize = 'xl',
  formatNumber = false,
  containerClassName,
  labelClassName,
  valueClassName,
  labelSkeletonClassName,
  valueSkeletonClassName,
}: MetricValueProps): ReactElement => {
  if (isLoading) {
    return (
      <div className={cn('flex flex-col gap-1', containerClassName)}>
        <Skeleton className={cn('h-4 w-20', labelSkeletonClassName)} />
        <Skeleton className={cn('h-8 w-12', valueSkeletonClassName)} />
      </div>
    );
  }

  const renderedValue =
    typeof value === 'number' && formatNumber ? value.toLocaleString() : String(value);

  return (
    <div className={cn('flex flex-col gap-1', containerClassName)}>
      <Text tone={labelTone} size={labelSize} className={labelClassName}>
        {label}
      </Text>
      <Text tone={valueTone} size={valueSize} className={valueClassName}>
        {renderedValue}
      </Text>
    </div>
  );
};
