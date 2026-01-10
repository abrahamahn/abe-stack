import { forwardRef, type ComponentPropsWithoutRef, type ElementType } from 'react';

import { InputElement } from '../elements/InputElement';
import { Text } from '../elements/Text';

import '../styles/components.css';

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
    <div className="ui-input-field">
      {label ? (
        <label htmlFor={inputId} className="ui-input-label">
          {label}
        </label>
      ) : null}
      <InputElement
        as={as}
        id={inputId}
        ref={ref}
        className={className}
        aria-describedby={error ? errorId : descId}
        aria-invalid={Boolean(error)}
        {...rest}
      />
      {description ? (
        <Text id={descId} tone="muted" className="ui-input-description">
          {description}
        </Text>
      ) : null}
      {error ? (
        <Text id={errorId} tone="danger" className="ui-input-error">
          {error}
        </Text>
      ) : null}
    </div>
  );
});

Input.displayName = 'Input';

export type { InputProps };
