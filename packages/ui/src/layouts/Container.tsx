import { cn } from '../utils/cn';
import '../theme/theme.css';

import type { ComponentPropsWithoutRef, ReactElement } from 'react';

type ContainerProps = ComponentPropsWithoutRef<'div'> & {
  size?: 'sm' | 'md' | 'lg';
};

const maxWidths: Record<NonNullable<ContainerProps['size']>, string> = {
  sm: '640px',
  md: '960px',
  lg: '1200px',
};

export function Container({
  size = 'md',
  className,
  style,
  ...rest
}: ContainerProps): ReactElement {
  return (
    <div
      className={cn('ui-container', className)}
      style={{
        margin: '0 auto',
        maxWidth: maxWidths[size],
        padding: '0 var(--ui-gap-lg)',
        ...style,
      }}
      {...rest}
    />
  );
}
