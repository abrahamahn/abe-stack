// main/client/ui/src/elements/Badge.tsx
import { forwardRef, type ComponentPropsWithoutRef, type ElementType } from 'react';
import '../styles/elements.css';

type BadgeTone = 'info' | 'success' | 'danger' | 'warning';

type BadgeProps = ComponentPropsWithoutRef<'span'> & {
  /** The HTML element or React component to render as */
  as?: ElementType;
  /** Visual style variant indicating semantic meaning */
  tone?: BadgeTone;
};

/**
 * A polymorphic badge component for displaying status, counts, or labels.
 *
 * @example
 * ```tsx
 * <Badge tone="success">Active</Badge>
 * ```
 */
export const Badge = forwardRef<HTMLElement, BadgeProps>((props, ref) => {
  const { as = 'span', tone = 'info', className = '', ...rest } = props;
  const Component: ElementType = as;
  return <Component ref={ref} className={`badge ${className}`.trim()} data-tone={tone} {...rest} />;
});

Badge.displayName = 'Badge';
