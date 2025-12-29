import { forwardRef, type ComponentPropsWithoutRef } from 'react';

import { InputPrimitive } from '../primitives/InputPrimitive';
import { Text } from '../primitives/Text';

type InputProps = ComponentPropsWithoutRef<'input'> & {
  label?: string;
  description?: string;
  error?: string;
};

export const Input = forwardRef<HTMLInputElement, InputProps>((props, ref) => {
  const { label, description, error, className, id, ...rest } = props;
  const inputId = id ?? `input-${Math.random().toString(36).slice(2, 7)}`;
  const descId = description ? `${inputId}-desc` : undefined;
  const errorId = error ? `${inputId}-err` : undefined;

  return (
    <div style={{ display: 'grid', gap: 6 }}>
      {label ? (
        <label htmlFor={inputId} style={{ fontWeight: 600, fontSize: '14px' }}>
          {label}
        </label>
      ) : null}
      <InputPrimitive
        id={inputId}
        ref={ref}
        className={className}
        aria-describedby={error ? errorId : descId}
        aria-invalid={Boolean(error)}
        {...rest}
      />
      {description ? (
        <Text id={descId} tone="muted" style={{ fontSize: '12px' }}>
          {description}
        </Text>
      ) : null}
      {error ? (
        <Text id={errorId} tone="danger" style={{ fontSize: '12px' }}>
          {error}
        </Text>
      ) : null}
    </div>
  );
});

Input.displayName = 'Input';

export default Input;
