// client/ui/src/elements/PasswordInput.tsx
import { estimatePasswordStrength, getStrengthColor, getStrengthLabel } from '@abe-stack/core';
import { forwardRef, useState } from 'react';

import { Button } from './Button';
import { Text } from './Text';

import '../styles/elements.css';

import type { ComponentPropsWithoutRef } from 'react';

type PasswordInputProps = Omit<ComponentPropsWithoutRef<'input'>, 'type'> & {
  /** Label for the input */
  label?: string;
  /** Description text below input */
  description?: string;
  /** Error message */
  error?: string;
  /** Show password strength indicator */
  showStrength?: boolean;
  /** Show/hide password toggle button */
  showToggle?: boolean;
  /** User inputs to check against (email, name, etc.) */
  userInputs?: string[];
};

/**
 * Password input with optional strength indicator and visibility toggle.
 *
 * @example
 * ```tsx
 * <PasswordInput label="Password" showStrength showToggle />
 * ```
 */
export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>((props, ref) => {
  const {
    label,
    description,
    error,
    showStrength = false,
    showToggle = true,
    userInputs = [],
    className = '',
    id,
    value,
    onChange,
    ...rest
  } = props;

  const [isVisible, setIsVisible] = useState(false);
  const [internalValue, setInternalValue] = useState('');

  const inputId = id ?? `password-${Math.random().toString(36).slice(2, 7)}`;
  const descId = description != null && description !== '' ? `${inputId}-desc` : undefined;
  const errorId = error != null && error !== '' ? `${inputId}-err` : undefined;

  // Use controlled or internal value
  const passwordValue = value !== undefined ? String(value) : internalValue;

  // Calculate strength if enabled
  const strength =
    showStrength && passwordValue.length > 0
      ? estimatePasswordStrength(passwordValue, userInputs)
      : null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    if (value === undefined) {
      setInternalValue(e.target.value);
    }
    onChange?.(e);
  };

  const toggleVisibility = (): void => {
    setIsVisible(!isVisible);
  };

  return (
    <div className="input-field">
      {label != null && label !== '' ? (
        <label htmlFor={inputId} className="input-label">
          {label}
        </label>
      ) : null}

      <div className="password-input-wrapper">
        <input
          ref={ref}
          id={inputId}
          type={isVisible ? 'text' : 'password'}
          className={`input password-input ${className}`.trim()}
          aria-describedby={error != null && error !== '' ? errorId : descId}
          aria-invalid={error != null && error !== ''}
          value={passwordValue}
          onChange={handleChange}
          {...rest}
        />

        {showToggle && (
          <Button
            type="button"
            variant="text"
            size="small"
            className="password-toggle"
            onClick={toggleVisibility}
            aria-label={isVisible ? 'Hide password' : 'Show password'}
          >
            {isVisible ? 'Hide' : 'Show'}
          </Button>
        )}
      </div>

      {showStrength && strength != null && (
        <div className="password-strength">
          <div className="password-strength-bar">
            <div
              className="password-strength-fill"
              style={{
                width: `${String((strength.score + 1) * 20)}%`,
                backgroundColor: getStrengthColor(strength.score),
              }}
            />
          </div>
          <Text tone="muted" className="password-strength-label">
            {getStrengthLabel(strength.score)}
            {strength.feedback.warning !== '' && ` - ${strength.feedback.warning}`}
          </Text>
        </div>
      )}

      {description != null && description !== '' && !showStrength ? (
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

PasswordInput.displayName = 'PasswordInput';
