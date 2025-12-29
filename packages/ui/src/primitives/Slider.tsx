import { forwardRef, type ComponentPropsWithoutRef } from 'react';

import { useControllableState } from '../hooks/useControllableState';
import './primitives.css';

type SliderProps = ComponentPropsWithoutRef<'input'> & {
  min?: number;
  max?: number;
  step?: number;
  value?: number;
  defaultValue?: number;
  onChange?: (value: number) => void;
};

export const Slider = forwardRef<HTMLInputElement, SliderProps>((props, ref) => {
  const {
    min = 0,
    max = 100,
    step = 1,
    value,
    defaultValue,
    onChange,
    className = '',
    ...rest
  } = props;

  const [currentValue, setValue] = useControllableState<number>({
    value,
    defaultValue: defaultValue ?? min,
    onChange,
  });

  const sliderValue = currentValue ?? min;

  return (
    <input
      ref={ref}
      type="range"
      className={`ui-slider ${className}`.trim()}
      min={min}
      max={max}
      step={step}
      value={sliderValue}
      onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
        setValue(Number(event.target.value));
      }}
      {...rest}
    />
  );
});

Slider.displayName = 'Slider';
