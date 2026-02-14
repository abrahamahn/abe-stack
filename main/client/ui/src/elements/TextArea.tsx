// main/client/ui/src/elements/TextArea.tsx
import { forwardRef, type ComponentPropsWithoutRef } from 'react';
import '../styles/elements.css';

type TextAreaProps = ComponentPropsWithoutRef<'textarea'>;

/**
 * A styled textarea component for multi-line text input.
 *
 * @example
 * ```tsx
 * <TextArea placeholder="Enter your message..." rows={4} />
 * ```
 */
export const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>((props, ref) => {
  const { className = '', ...rest } = props;
  return <textarea ref={ref} className={`textarea ${className}`.trim()} {...rest} />;
});

TextArea.displayName = 'TextArea';
