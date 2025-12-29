import { forwardRef, type ComponentPropsWithoutRef } from 'react';
import './primitives.css';

type ProgressProps = ComponentPropsWithoutRef<'div'> & {
  value: number; // 0-100
};

export const Progress = forwardRef<HTMLDivElement, ProgressProps>((props, ref) => {
  const { value, className = '', ...rest } = props;
  const clamped = Math.min(100, Math.max(0, value));

  return (
    <div
      ref={ref}
      className={`ui-progress ${className}`.trim()}
      role="progressbar"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
      {...rest}
    >
      <div className="ui-progress-bar" style={{ width: `${String(clamped)}%` }} />
    </div>
  );
});

Progress.displayName = 'Progress';
