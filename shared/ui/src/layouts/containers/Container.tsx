// shared/ui/src/layouts/containers/Container.tsx
import { cn } from '@utils/cn';
import '../../styles/layouts.css';

import { forwardRef, type ComponentPropsWithoutRef } from 'react';

type ContainerProps = ComponentPropsWithoutRef<'div'> & {
  size?: 'sm' | 'md' | 'lg';
};

const sizeClasses: Record<NonNullable<ContainerProps['size']>, string> = {
  sm: 'container--sm',
  md: 'container--md',
  lg: 'container--lg',
};

const Container = forwardRef<HTMLDivElement, ContainerProps>((props, ref) => {
  const { size = 'md', className, ...rest } = props;
  const sizeClass = size in sizeClasses ? sizeClasses[size] : undefined;
  return <div ref={ref} className={cn('container', sizeClass, className)} {...rest} />;
});

Container.displayName = 'Container';

export { Container };
export type { ContainerProps };
