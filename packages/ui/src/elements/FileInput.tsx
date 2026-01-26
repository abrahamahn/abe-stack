// packages/ui/src/elements/FileInput.tsx
import { forwardRef, type ComponentPropsWithoutRef } from 'react';

import { Text } from './Text';

import '../styles/elements.css';

type FileInputProps = Omit<ComponentPropsWithoutRef<'input'>, 'type'> & {
  type?: 'file';
};

type FileInputFieldProps = Omit<ComponentPropsWithoutRef<'input'>, 'type'> & {
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

const FileInputField = forwardRef<HTMLInputElement, FileInputFieldProps>((props, ref) => {
  const { label, hideLabel, description, error, className, id, type = 'file', ...rest } = props;
  const inputId = id ?? `file-input-${Math.random().toString(36).slice(2, 7)}`;
  const descId = (description != null && description !== '') ? `${inputId}-desc` : undefined;
  const errorId = (error != null && error !== '') ? `${inputId}-err` : undefined;

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
        aria-describedby={(error != null && error !== '') ? errorId : descId}
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

