import { forwardRef, type ComponentPropsWithoutRef } from 'react';
import './primitives.css';

type BadgeTone = 'info' | 'success' | 'danger' | 'warning';

type BadgeProps = ComponentPropsWithoutRef<'span'> & {
  tone?: BadgeTone;
};

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>((props, ref) => {
  const { tone = 'info', className = '', ...rest } = props;
  return <span ref={ref} className={`ui-badge ${className}`.trim()} data-tone={tone} {...rest} />;
});

Badge.displayName = 'Badge';
