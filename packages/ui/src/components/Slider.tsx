// packages/ui/src/components/Slider.tsx
import { useControllableState } from '@hooks/useControllableState';
import { forwardRef, type ComponentPropsWithoutRef } from 'react';

import '../styles/components.css';

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

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>): void => {
    if (props.disabled) return;

    let nextValue = sliderValue;
    if (event.key === 'ArrowRight' || event.key === 'ArrowUp') {
      nextValue = Math.min(max, sliderValue + step);
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') {
      nextValue = Math.max(min, sliderValue - step);
    } else {
      return;
    }

    if (nextValue !== sliderValue) {
      event.preventDefault();
      setValue(nextValue);
    }
  };

  return (
    <input
      ref={ref}
      type="range"
      className={`slider ${className}`.trim()}
      min={min}
      max={max}
      step={step}
      value={sliderValue}
      onKeyDown={handleKeyDown}
      onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
        setValue(Number(event.target.value));
      }}
      {...rest}
    />
  );
});

Slider.displayName = 'Slider';
