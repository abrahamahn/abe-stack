import { forwardRef, type ComponentPropsWithoutRef, type ReactNode } from 'react';
import '../styles/elements.css';

type AlertTone = 'info' | 'success' | 'danger' | 'warning';

type AlertProps = ComponentPropsWithoutRef<'div'> & {
  tone?: AlertTone;
  icon?: ReactNode;
  title?: ReactNode;
};

export const Alert = forwardRef<HTMLDivElement, AlertProps>((props, ref) => {
  const { tone = 'info', icon, title, children, className = '', ...rest } = props;
  return (
    <div
      ref={ref}
      className={`ui-alert ${className}`.trim()}
      data-tone={tone}
      role="status"
      {...rest}
    >
      {icon ? <span>{icon}</span> : null}
      <div>
        {title ? <div style={{ fontWeight: 700, marginBottom: 4 }}>{title}</div> : null}
        <div>{children}</div>
      </div>
    </div>
  );
});

Alert.displayName = 'Alert';
