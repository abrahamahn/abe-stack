import { useId, useRef, type KeyboardEvent, type ReactElement, type ReactNode } from 'react';
import './primitives.css';

export type RadioGroupProps = {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  name: string;
  children: ReactNode;
  className?: string;
  'aria-label'?: string;
  'aria-labelledby'?: string;
};

export function RadioGroup(props: RadioGroupProps): ReactElement {
  const {
    value: _value,
    defaultValue: _defaultValue,
    onValueChange: _onValueChange,
    name,
    children,
    className = '',
    'aria-label': ariaLabel,
    'aria-labelledby': ariaLabelledBy,
  } = props;

  const groupRef = useRef<HTMLDivElement>(null);
  const generatedName = useId();
  const radioName = name || generatedName;

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
    if (!groupRef.current) return;

    const radios = Array.from(
      groupRef.current.querySelectorAll<HTMLInputElement>('input[type="radio"]'),
    );
    const currentIndex = radios.findIndex((radio) => radio === document.activeElement);

    let nextIndex = currentIndex;

    switch (event.key) {
      case 'ArrowDown':
      case 'ArrowRight':
        event.preventDefault();
        nextIndex = (currentIndex + 1) % radios.length;
        break;
      case 'ArrowUp':
      case 'ArrowLeft':
        event.preventDefault();
        nextIndex = (currentIndex - 1 + radios.length) % radios.length;
        break;
      case 'Home':
        event.preventDefault();
        nextIndex = 0;
        break;
      case 'End':
        event.preventDefault();
        nextIndex = radios.length - 1;
        break;
      default:
        return;
    }

    const nextRadio = radios[nextIndex];
    if (nextRadio) {
      nextRadio.focus();
      nextRadio.click();
    }
  };

  return (
    <div
      ref={groupRef}
      role="radiogroup"
      aria-label={ariaLabel}
      aria-labelledby={ariaLabelledBy}
      className={`ui-radio-group ${className}`.trim()}
      onKeyDown={handleKeyDown}
      data-name={radioName}
    >
      {children}
    </div>
  );
}
