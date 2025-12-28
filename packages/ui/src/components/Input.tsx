import { forwardRef, type ComponentPropsWithoutRef } from 'react';

export const Input = forwardRef<HTMLInputElement, ComponentPropsWithoutRef<'input'>>(
  (props, ref) => {
    return (
      <input
        ref={ref}
        {...props}
        style={{
          padding: '0.5rem',
          border: '1px solid #e2e8f0',
          borderRadius: '0.25rem',
          outline: 'none',
          width: '100%',
          ...props.style,
        }}
      />
    );
  },
);

Input.displayName = 'Input';

// Also export as default for backward compatibility
export default Input;
