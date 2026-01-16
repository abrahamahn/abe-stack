// packages/ui/src/elements/Input.tsx
import { Text } from '@elements/Text';
import { forwardRef, type ComponentPropsWithoutRef, type ElementType } from 'react';

import '../styles/elements.css';

type InputRootProps = ComponentPropsWithoutRef<'input'> & {
  as?: ElementType;
};

type InputFieldProps = ComponentPropsWithoutRef<'input'> & {
  as?: ElementType;
  label?: string;
  description?: string;
  error?: string;
};

const InputRoot = forwardRef<HTMLElement, InputRootProps>((props, ref) => {
  const { as = 'input', className = '', ...rest } = props;
  const Component: ElementType = as;
  return <Component ref={ref} className={`input ${className}`.trim()} {...rest} />;
});
InputRoot.displayName = 'Input';

const InputField = forwardRef<HTMLInputElement, InputFieldProps>((props, ref) => {
  const { as, label, description, error, className, id, ...rest } = props;
  const inputId = id ?? `input-${Math.random().toString(36).slice(2, 7)}`;
  const descId = description ? `${inputId}-desc` : undefined;
  const errorId = error ? `${inputId}-err` : undefined;

  return (
    <div className="input-field">
      {label ? (
        <label htmlFor={inputId} className="input-label">
          {label}
        </label>
      ) : null}
      <InputRoot
        as={as}
        id={inputId}
        ref={ref}
        className={className}
        aria-describedby={error ? errorId : descId}
        aria-invalid={Boolean(error)}
        {...rest}
      />
      {description ? (
        <Text id={descId} tone="muted" className="input-description">
          {description}
        </Text>
      ) : null}
      {error ? (
        <Text id={errorId} tone="danger" className="input-error">
          {error}
        </Text>
      ) : null}
    </div>
  );
});
InputField.displayName = 'Input.Field';

export const Input = Object.assign(InputRoot, {
  Field: InputField,
});

export type { InputRootProps, InputFieldProps };
