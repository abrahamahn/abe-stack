import { forwardRef, type ComponentPropsWithoutRef } from 'react';
import './primitives.css';

type SliderProps = ComponentPropsWithoutRef<'input'> & {
  min?: number;
  max?: number;
  step?: number;
  value: number;
  onChange: (value: number) => void;
};

export const Slider = forwardRef<HTMLInputElement, SliderProps>((props, ref) => {
  const { min = 0, max = 100, step = 1, value, onChange, className = '', ...rest } = props;
  return (
    <input
      ref={ref}
      type="range"
      className={`ui-slider ${className}`.trim()}
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
        onChange(Number(event.target.value));
      }}
      {...rest}
    />
  );
});

Slider.displayName = 'Slider';
