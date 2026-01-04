import { forwardRef, type ComponentPropsWithoutRef, type ElementType } from 'react';
import '../styles/elements.css';

type BadgeTone = 'info' | 'success' | 'danger' | 'warning';

type BadgeProps = ComponentPropsWithoutRef<'span'> & {
  as?: ElementType;
  tone?: BadgeTone;
};

export const Badge = forwardRef<HTMLElement, BadgeProps>((props, ref) => {
  const { as = 'span', tone = 'info', className = '', ...rest } = props;
  const Component: ElementType = as;
  return <Component ref={ref} className={`badge ${className}`.trim()} data-tone={tone} {...rest} />;
});

Badge.displayName = 'Badge';
