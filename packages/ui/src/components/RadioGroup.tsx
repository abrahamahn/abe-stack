// packages/ui/src/components/RadioGroup.tsx
import {
  createContext,
  useContext,
  useId,
  useRef,
  type KeyboardEvent,
  type ReactElement,
  type ReactNode,
} from 'react';

import { useControllableState } from '../hooks/useControllableState';
import '../styles/components.css';

export type RadioGroupProps = {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  name?: string;
  children: ReactNode;
  className?: string;
  'aria-label'?: string;
  'aria-labelledby'?: string;
};

type RadioGroupContextType = {
  name: string;
  value?: string;
  onValueChange: (value: string) => void;
};

const RadioGroupContext = createContext<RadioGroupContextType | null>(null);

export function useRadioGroupContext(): RadioGroupContextType | null {
  return useContext(RadioGroupContext);
}

export function RadioGroup(props: RadioGroupProps): ReactElement {
  const {
    value: valueProp,
    defaultValue,
    onValueChange,
    name,
    children,
    className = '',
    'aria-label': ariaLabel,
    'aria-labelledby': ariaLabelledBy,
  } = props;

  const groupRef = useRef<HTMLDivElement>(null);
  const generatedName = useId();
  const radioName = name || generatedName;

  const [value, setValue] = useControllableState({
    value: valueProp,
    defaultValue,
    onChange: onValueChange,
  });

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
    if (!groupRef.current) return;

    const radios = Array.from(
      groupRef.current.querySelectorAll<HTMLInputElement>(
        'input[type="radio"]:not(:disabled):not([aria-disabled="true"])',
      ),
    );
    // Note: We need to find where the focus IS, but that might be a disabled radio if it somehow got focus.
    // However, usually we want to navigate relative to the currently focused radio.
    // If the currently focused element is not in our list of "navigable" (enabled) radios, we might need to find it differently.
    // But for simplicity, let's assume we only navigate between enabled ones.

    const currentElement = document.activeElement as HTMLInputElement;
    const currentIndex = radios.indexOf(currentElement);

    // If current element is not found (e.g. it's disabled and we excluded it),
    // we should probably try to find the "next" logical one, but standard behavior usually implies focus is on a valid item.
    // If focus is on a disabled item (which shouldn't happen easily with tab index), we might be in a weird state.
    // For now, let's proceed with finding the next/prev in the enabled list.

    let nextIndex = currentIndex;

    switch (event.key) {
      case 'ArrowDown':
      case 'ArrowRight': {
        event.preventDefault();
        if (currentIndex === -1) {
          nextIndex = 0;
        } else {
          nextIndex = (currentIndex + 1) % radios.length;
        }
        break;
      }
      case 'ArrowUp':
      case 'ArrowLeft': {
        event.preventDefault();
        if (currentIndex === -1) {
          nextIndex = radios.length - 1;
        } else {
          nextIndex = (currentIndex - 1 + radios.length) % radios.length;
        }
        break;
      }
      case 'Home': {
        event.preventDefault();
        nextIndex = 0;
        break;
      }
      case 'End': {
        event.preventDefault();
        nextIndex = radios.length - 1;
        break;
      }
      default:
        return;
    }

    const nextRadio = radios[nextIndex];
    if (nextRadio) {
      nextRadio.focus();
      // If we are controlling value, we should also trigger the change
      // But clicking triggers it natively for the input.
      // However, check if we need to manually trigger onChange if the input is controlled by us but not by the browser's native group.
      // Since we use the same `name` attribute, browser native grouping handles the "uncheck others" part mostly.
      // But for React state sync, `nextRadio.click()` is usually the safest way to trigger both focus and selection events.
      nextRadio.click();
    }
  };

  return (
    <RadioGroupContext.Provider
      value={{
        name: radioName,
        value,
        onValueChange: setValue,
      }}
    >
      <div
        ref={groupRef}
        role="radiogroup"
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledBy}
        className={`radio-group ${className}`.trim()}
        onKeyDown={handleKeyDown}
        data-name={radioName}
      >
        {children}
      </div>
    </RadioGroupContext.Provider>
  );
}
