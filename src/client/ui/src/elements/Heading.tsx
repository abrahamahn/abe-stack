// src/client/ui/src/elements/Heading.tsx
import {
  forwardRef,
  type ComponentPropsWithoutRef,
  type ElementType,
  type ReactElement,
} from 'react';

import { cn } from '../utils/cn';

import '../styles/elements.css';

type HeadingSize = 'xl' | 'lg' | 'md' | 'sm';

type HeadingProps = ComponentPropsWithoutRef<'h2'> & {
  /** The HTML element to render as (typically h1-h6) */
  as?: ElementType;
  /** Visual size variant independent of semantic level */
  size?: HeadingSize;
};

/**
 * A polymorphic heading component with consistent sizing independent of HTML level.
 *
 * @example
 * ```tsx
 * <Heading as="h1" size="xl">Page Title</Heading>
 * ```
 */
export const Heading = forwardRef<HTMLElement, HeadingProps>((props, ref): ReactElement => {
  const { as = 'h2', size = 'lg', className, ...rest } = props;
  const Component: ElementType = as;
  return <Component ref={ref} className={cn('heading', className)} data-size={size} {...rest} />;
});

Heading.displayName = 'Heading';
