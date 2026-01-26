// packages/ui/src/elements/Text.tsx
import {
    forwardRef,
    type ComponentPropsWithoutRef,
    type ElementType,
    type ReactElement,
} from 'react';

import { cn } from '../utils/cn';

import '../styles/elements.css';

type Tone = 'default' | 'muted' | 'danger' | 'success';
type Size = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

type TextProps = ComponentPropsWithoutRef<'p'> & {
  /** The HTML element or React component to render as */
  as?: ElementType;
  /** Visual style variant for semantic emphasis */
  tone?: Tone;
  /** Text size variant */
  size?: Size;
};

/**
 * A polymorphic text component for paragraphs and inline text.
 *
 * @example
 * ```tsx
 * <Text tone="muted">Helper text</Text>
 * ```
 */
export const Text = forwardRef<HTMLElement, TextProps>((props, ref): ReactElement => {
  const { as, tone = 'default', size, className, ...rest } = props;
  const Component: ElementType = as ?? 'p';
  const sizeClass = size != null ? `text-${size}` : null;
  return (
    <Component ref={ref} className={cn('text', sizeClass, className)} data-tone={tone} {...rest} />
  );
});

Text.displayName = 'Text';
