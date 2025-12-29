import {
  Children,
  forwardRef,
  isValidElement,
  useMemo,
  useState,
  type ComponentPropsWithoutRef,
  type ReactNode,
} from 'react';

import { useDisclosure } from '../hooks/useDisclosure';
import './primitives.css';

type SelectProps = Omit<ComponentPropsWithoutRef<'button'>, 'value' | 'defaultValue'> & {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  children: ReactNode;
};

type OptionShape = { value: string; label: ReactNode };

export const Select = forwardRef<HTMLDivElement, SelectProps>((props, ref) => {
  const {
    className = '',
    children,
    value,
    defaultValue,
    onValueChange,
    onBlur,
    name,
    disabled,
    ...rest
  } = props;

  const options = useMemo<OptionShape[]>(() => {
    return Children.toArray(children)
      .map((child) => {
        if (isValidElement<ComponentPropsWithoutRef<'option'>>(child) && child.type === 'option') {
          const label = child.props.children;
          const fallbackValue =
            typeof label === 'string' || typeof label === 'number' ? String(label) : '';
          const val = child.props.value ?? fallbackValue;
          return { value: val, label };
        }
        return null;
      })
      .filter(Boolean) as OptionShape[];
  }, [children]);

  const fallback = options[0]?.value ?? '';
  const [internalValue, setInternalValue] = useState<string>(defaultValue ?? fallback);
  const currentValue = value ?? internalValue;
  const currentLabel = options.find((opt) => opt.value === currentValue)?.label ?? currentValue;

  const { isOpen, toggle, close, setOpen } = useDisclosure({ defaultOpen: false });

  const handleSelect = (next: string): void => {
    if (value === undefined) {
      setInternalValue(next);
    }
    onValueChange?.(next);
    close();
  };

  return (
    <div className={`ui-select-custom ${className}`.trim()} ref={ref}>
      <button
        type="button"
        className="ui-select ui-select-trigger"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        disabled={disabled}
        onClick={() => {
          toggle();
        }}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            setOpen(true);
          }
        }}
        onBlur={onBlur}
        data-open={isOpen}
        name={name}
        {...rest}
      >
        <span className="ui-select-label">{currentLabel}</span>
      </button>
      {isOpen ? (
        <div className="ui-select-menu" role="listbox">
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              role="option"
              aria-selected={opt.value === currentValue}
              className="ui-select-option"
              data-selected={opt.value === currentValue}
              onClick={() => {
                handleSelect(opt.value);
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
});

Select.displayName = 'Select';
