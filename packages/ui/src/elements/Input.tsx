// packages/ui/src/elements/Input.tsx
import { forwardRef, type ComponentPropsWithoutRef, type ElementType } from 'react';

import { Text } from './Text';

import '../styles/elements.css';

type InputRootProps = ComponentPropsWithoutRef<'input'> & {
  /** The HTML element to render as */
  as?: ElementType;
};

type InputFieldProps = ComponentPropsWithoutRef<'input'> & {
  /** The HTML element to render as */
  as?: ElementType;
  /** Visible label text for the input */
  label?: string;
  /** Visually hide the label (keeps it accessible) */
  hideLabel?: boolean;
  /** Helper text displayed below the input */
  description?: string;
  /** Error message (also sets aria-invalid) */
  error?: string;
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
  const descId = description ? `${inputId}-desc` : undefined;
  const errorId = error ? `${inputId}-err` : undefined;

  return (
    <div className="input-field">
      {label ? (
        <label
          htmlFor={inputId}
          className={`input-label ${hideLabel ? 'visually-hidden' : ''}`.trim()}
        >
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
