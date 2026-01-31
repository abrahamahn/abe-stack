// shared/ui/src/elements/Alert.tsx
import { forwardRef, type ComponentPropsWithoutRef, type ReactNode } from 'react';
import '../styles/elements.css';

type AlertTone = 'info' | 'success' | 'danger' | 'warning';

type AlertProps = ComponentPropsWithoutRef<'div'> & {
  /** Visual style variant indicating message type */
  tone?: AlertTone;
  /** Optional icon element to display */
  icon?: ReactNode;
  /** Optional title/heading for the alert */
  title?: ReactNode;
};

/**
 * A component for displaying contextual feedback messages.
 *
 * @example
 * ```tsx
 * <Alert tone="success" title="Success">
 *   Your changes have been saved.
 * </Alert>
 * ```
 */
export const Alert = forwardRef<HTMLDivElement, AlertProps>((props, ref) => {
  const { tone = 'info', icon, title, children, className = '', ...rest } = props;
  return (
    <div ref={ref} className={`alert ${className}`.trim()} data-tone={tone} role="status" {...rest}>
      {icon != null ? <span>{icon}</span> : null}
      <div>
        {title != null ? <div className="alert-title">{title}</div> : null}
        <div>{children}</div>
      </div>
    </div>
  );
});

Alert.displayName = 'Alert';
