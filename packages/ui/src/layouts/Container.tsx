import { cn } from '../utils/cn';
import './layouts.css';

import type { ComponentPropsWithoutRef, ReactElement } from 'react';

type ContainerProps = ComponentPropsWithoutRef<'div'> & {
  size?: 'sm' | 'md' | 'lg';
};

const sizeClasses: Record<NonNullable<ContainerProps['size']>, string> = {
  sm: 'ui-container--sm',
  md: 'ui-container--md',
  lg: 'ui-container--lg',
};

export function Container({ size = 'md', className, ...rest }: ContainerProps): ReactElement {
  const sizeClass = size in sizeClasses ? sizeClasses[size] : undefined;
  return <div className={cn('ui-container', sizeClass, className)} {...rest} />;
}
