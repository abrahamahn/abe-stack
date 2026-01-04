import { forwardRef, type ComponentPropsWithoutRef, type CSSProperties } from 'react';
import '../styles/elements.css';

type ProgressProps = ComponentPropsWithoutRef<'div'> & {
  value: number; // 0-100
};

export const Progress = forwardRef<HTMLDivElement, ProgressProps>((props, ref) => {
  const { value, className = '', style, ...rest } = props;
  // Handle NaN/invalid values by defaulting to 0
  const safeValue = Number.isNaN(value) ? 0 : value;
  const clamped = Math.min(100, Math.max(0, safeValue));

  return (
    <div
      ref={ref}
      className={`progress ${className}`.trim()}
      style={style}
      role="progressbar"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
      {...rest}
    >
      <div
        className="progress-bar"
        style={{ '--progress-value': `${String(clamped)}%` } as CSSProperties}
      />
    </div>
  );
});

Progress.displayName = 'Progress';
