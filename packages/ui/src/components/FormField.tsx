// packages/ui/src/components/FormField.tsx
import { forwardRef, type ComponentPropsWithoutRef, type ReactNode } from 'react';
import '../styles/components.css';

type FormFieldProps = ComponentPropsWithoutRef<'div'> & {
  /**
   * Label text for the form field
   */
  label: string;
  /**
   * HTML id for the input element (used to associate label)
   */
  htmlFor: string;
  /**
   * Error message to display
   */
  error?: string;
  /**
   * Helper text to display below the input
   */
  helperText?: string;
  /**
   * Whether the field is required
   */
  required?: boolean;
  /**
   * The form input element(s)
   */
  children: ReactNode;
};

/**
 * Form field wrapper with label, error, and helper text support
 *
 * @example
 * ```tsx
 * <FormField label="Email" htmlFor="email" required>
 *   <Input id="email" type="email" />
 * </FormField>
 *
 * <FormField label="Password" htmlFor="password" error="Password is required">
 *   <Input id="password" type="password" />
 * </FormField>
 * ```
 */
export const FormField = forwardRef<HTMLDivElement, FormFieldProps>((props, ref) => {
  const {
    label,
    htmlFor,
    error,
    helperText,
    required = false,
    children,
    className = '',
    ...rest
  } = props;

  return (
    <div ref={ref} className={`form-field ${className}`.trim()} {...rest}>
      <label htmlFor={htmlFor} className="form-field-label">
        {label}
        {required ? <span className="form-field-required">*</span> : null}
      </label>
      <div className="form-field-input">{children}</div>
      {error != null && error !== '' ? (
         <span className="form-field-error" role="alert">
           {error}
         </span>
       ) : null}
       {(helperText != null && helperText !== '') && (error == null || error === '') ? <span className="form-field-helper">{helperText}</span> : null}
    </div>
  );
});

FormField.displayName = 'FormField';
