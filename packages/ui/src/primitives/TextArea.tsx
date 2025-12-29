import { forwardRef, type ComponentPropsWithoutRef } from 'react';
import './primitives.css';

type TextAreaProps = ComponentPropsWithoutRef<'textarea'>;

export const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>((props, ref) => {
  const { className = '', ...rest } = props;
  return <textarea ref={ref} className={`ui-textarea ${className}`.trim()} {...rest} />;
});

TextArea.displayName = 'TextArea';
