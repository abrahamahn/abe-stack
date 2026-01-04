import { forwardRef, type ComponentPropsWithoutRef } from 'react';
import '../styles/elements.css';

type VisuallyHiddenProps = ComponentPropsWithoutRef<'span'>;

export const VisuallyHidden = forwardRef<HTMLSpanElement, VisuallyHiddenProps>((props, ref) => {
  const { className = '', ...rest } = props;
  return <span ref={ref} className={`visually-hidden ${className}`.trim()} {...rest} />;
});

VisuallyHidden.displayName = 'VisuallyHidden';
