// src/client/ui/src/elements/Input.tsx
import { forwardRef, type ComponentPropsWithoutRef, type ElementType } from 'react';

import { Text } from './Text';

import '../styles/elements.css';

type InputRootProps = ComponentPropsWithoutRef<'input'> & {
  /** The HTML element to render as */
  as?: ElementType | undefined;
};

type InputFieldProps = ComponentPropsWithoutRef<'input'> & {
  /** The HTML element to render as */
  as?: ElementType | undefined;
  /** Visible label text for the input */
  label?: string | undefined;
  /** Visually hide the label (keeps it accessible) */
  hideLabel?: boolean | undefined;
  /** Helper text displayed below the input */
  description?: string | undefined;
  /** Error message (also sets aria-invalid) */
  error?: string | undefined;
};

/**
 * Base input element with consistent styling.
 *
 * @example
 * ```tsx
 * <Input placeholder="Enter text..." />
 * ```
 */
const InputRoot = forwardRef<HTMLElement, InputRootProps>((props, ref) => {
  const { as = 'input', className = '', ...rest } = props;
  const Component: ElementType = as;
  return <Component ref={ref} className={`input ${className}`.trim()} {...rest} />;
});
InputRoot.displayName = 'Input';

/**
 * Input with integrated label, description, and error message support.
 *
 * @example
 * ```tsx
 * <Input.Field label="Email" type="email" error={errors.email} />
 * ```
 */
const InputField = forwardRef<HTMLInputElement, InputFieldProps>((props, ref) => {
  const { as, label, hideLabel, description, error, className, id, ...rest } = props;
  const inputId = id ?? `input-${Math.random().toString(36).slice(2, 7)}`;
  const descId = description != null && description !== '' ? `${inputId}-desc` : undefined;
  const errorId = error != null && error !== '' ? `${inputId}-err` : undefined;

  return (
    <div className="input-field">
      {label != null && label !== '' ? (
        <label
          htmlFor={inputId}
          className={`input-label ${hideLabel === true ? 'visually-hidden' : ''}`.trim()}
        >
          {label}
        </label>
      ) : null}
      <InputRoot
        as={as}
        id={inputId}
        ref={ref}
        className={className}
        aria-describedby={error != null && error !== '' ? errorId : descId}
        aria-invalid={error != null && error !== ''}
        {...rest}
      />
      {description != null && description !== '' ? (
        <Text id={descId} tone="muted" className="input-description">
          {description}
        </Text>
      ) : null}
      {error != null && error !== '' ? (
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

export type { InputFieldProps, InputRootProps };
