// packages/ui/src/layouts/containers/Container.tsx
import { cn } from '../../utils/cn';
import '../../styles/layouts.css';

import type { ComponentPropsWithoutRef, ReactElement } from 'react';

type ContainerProps = ComponentPropsWithoutRef<'div'> & {
  size?: 'sm' | 'md' | 'lg';
};

const sizeClasses: Record<NonNullable<ContainerProps['size']>, string> = {
  sm: 'container--sm',
  md: 'container--md',
  lg: 'container--lg',
};

export function Container({ size = 'md', className, ...rest }: ContainerProps): ReactElement {
  const sizeClass = size in sizeClasses ? sizeClasses[size] : undefined;
  return <div className={cn('container', sizeClass, className)} {...rest} />;
}
