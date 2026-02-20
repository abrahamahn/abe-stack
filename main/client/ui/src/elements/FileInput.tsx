// main/client/ui/src/elements/FileInput.tsx
import { forwardRef, useId, type ComponentPropsWithoutRef } from 'react';

import { Text } from './Text';

import '../styles/elements.css';

type FileInputProps = Omit<ComponentPropsWithoutRef<'input'>, 'type'> & {
  /** Input type override (always 'file') */
  type?: 'file';
};

type FileInputFieldProps = Omit<ComponentPropsWithoutRef<'input'>, 'type'> & {
  /** Input type override (always 'file') */
  type?: 'file';
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
 * A styled file input element.
 *
 * @example
 * ```tsx
 * <FileInput accept="image/*" />
 * ```
 */
const FileInputRoot = forwardRef<HTMLInputElement, FileInputProps>((props, ref) => {
  const { className = '', type = 'file', ...rest } = props;
  return (
    <input ref={ref} type={type} className={`input file-input ${className}`.trim()} {...rest} />
  );
});

FileInputRoot.displayName = 'FileInput';

/**
 * A file input with integrated label, description, and error message support.
 *
 * @example
 * ```tsx
 * <FileInput.Field label="Upload avatar" accept="image/*" error={errors.avatar} />
 * ```
 */
const FileInputField = forwardRef<HTMLInputElement, FileInputFieldProps>((props, ref) => {
  const { label, hideLabel, description, error, className, id, type = 'file', ...rest } = props;
  const generatedId = useId();
  const inputId = id ?? `file-input-${generatedId}`;
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
      <FileInputRoot
        ref={ref}
        id={inputId}
        type={type}
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

FileInputField.displayName = 'FileInput.Field';

export const FileInput = Object.assign(FileInputRoot, {
  Field: FileInputField,
});

export type { FileInputFieldProps, FileInputProps };
