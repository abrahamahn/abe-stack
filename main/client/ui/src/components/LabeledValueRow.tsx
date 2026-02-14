// main/client/ui/src/components/LabeledValueRow.tsx
import { Skeleton } from '../elements/Skeleton';
import { Text } from '../elements/Text';
import { cn } from '../utils/cn';

import type { ReactElement, ReactNode } from 'react';

type TextTone = 'default' | 'muted' | 'danger' | 'success';
type TextSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

export interface LabeledValueRowProps {
  label: string;
  value: ReactNode;
  isLoading?: boolean;
  className?: string;
  labelTone?: TextTone;
  labelSize?: TextSize;
  labelClassName?: string;
  valueTone?: TextTone;
  valueSize?: TextSize;
  valueClassName?: string;
  preserveValueElement?: boolean;
  loadingLabelClassName?: string;
  loadingValueClassName?: string;
}

export const LabeledValueRow = ({
  label,
  value,
  isLoading = false,
  className,
  labelTone = 'muted',
  labelSize = 'sm',
  labelClassName,
  valueTone = 'default',
  valueSize,
  valueClassName,
  preserveValueElement = true,
  loadingLabelClassName = 'h-4 w-24',
  loadingValueClassName = 'h-5 w-48',
}: LabeledValueRowProps): ReactElement => {
  if (isLoading) {
    return (
      <div className={cn('flex flex-col gap-1', className)}>
        <Skeleton className={loadingLabelClassName} />
        <Skeleton className={loadingValueClassName} />
      </div>
    );
  }

  return (
    <div className={cn('flex flex-col gap-1', className)}>
      <Text tone={labelTone} size={labelSize} className={labelClassName}>
        {label}
      </Text>
      {value === null || value === undefined ? (
        <Text
          tone={valueTone}
          {...(valueSize !== undefined ? { size: valueSize } : {})}
          className={valueClassName}
        >
          -
        </Text>
      ) : typeof value === 'string' || typeof value === 'number' ? (
        <Text
          tone={valueTone}
          {...(valueSize !== undefined ? { size: valueSize } : {})}
          className={valueClassName}
        >
          {String(value)}
        </Text>
      ) : preserveValueElement ? (
        <>{value}</>
      ) : (
        <Text
          tone={valueTone}
          {...(valueSize !== undefined ? { size: valueSize } : {})}
          className={valueClassName}
        >
          {value}
        </Text>
      )}
    </div>
  );
};
