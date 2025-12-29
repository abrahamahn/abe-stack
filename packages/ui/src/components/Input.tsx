import { forwardRef, type ComponentPropsWithoutRef, type ElementType } from 'react';

import { InputPrimitive } from '../primitives/InputPrimitive';
import { Text } from '../primitives/Text';

type InputProps = ComponentPropsWithoutRef<'input'> & {
  as?: ElementType;
  label?: string;
  description?: string;
  error?: string;
};

export const Input = forwardRef<HTMLInputElement, InputProps>((props, ref) => {
  const { as, label, description, error, className, id, ...rest } = props;
  const inputId = id ?? `input-${Math.random().toString(36).slice(2, 7)}`;
  const descId = description ? `${inputId}-desc` : undefined;
  const errorId = error ? `${inputId}-err` : undefined;

  return (
    <div style={{ display: 'grid', gap: 'var(--ui-gap-sm)' }}>
      {label ? (
        <label
          htmlFor={inputId}
          style={{
            fontWeight: 'var(--ui-font-weight-medium)',
            fontSize: 'var(--ui-font-size-sm)',
          }}
        >
          {label}
        </label>
      ) : null}
      <InputPrimitive
        as={as}
        id={inputId}
        ref={ref}
        className={className}
        aria-describedby={error ? errorId : descId}
        aria-invalid={Boolean(error)}
        {...rest}
      />
      {description ? (
        <Text id={descId} tone="muted" style={{ fontSize: 'var(--ui-font-size-xs)' }}>
          {description}
        </Text>
      ) : null}
      {error ? (
        <Text id={errorId} tone="danger" style={{ fontSize: 'var(--ui-font-size-xs)' }}>
          {error}
        </Text>
      ) : null}
    </div>
  );
});

Input.displayName = 'Input';

export default Input;
