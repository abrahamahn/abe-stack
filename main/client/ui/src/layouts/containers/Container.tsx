// main/client/ui/src/layouts/containers/Container.tsx
import { cn } from '@utils/cn';
import { forwardRef, type ComponentPropsWithoutRef } from 'react';
import '../../styles/layouts.css';

type ContainerProps = ComponentPropsWithoutRef<'div'> & {
  /** Maximum width preset: 'sm' (narrow), 'md' (default), or 'lg' (wide) */
  size?: 'sm' | 'md' | 'lg';
};

const sizeClasses: Record<NonNullable<ContainerProps['size']>, string> = {
  sm: 'container--sm',
  md: 'container--md',
  lg: 'container--lg',
};

/**
 * A responsive container that constrains content width and centers horizontally.
 * Supports three size presets via CSS classes.
 *
 * @example
 * ```tsx
 * <Container size="lg">
 *   <PageContent />
 * </Container>
 * ```
 */
const Container = forwardRef<HTMLDivElement, ContainerProps>((props, ref) => {
  const { size = 'md', className, ...rest } = props;
  const sizeClass = size in sizeClasses ? sizeClasses[size] : undefined;
  return <div ref={ref} className={cn('container', sizeClass, className)} {...rest} />;
});

Container.displayName = 'Container';

export { Container };
export type { ContainerProps };
