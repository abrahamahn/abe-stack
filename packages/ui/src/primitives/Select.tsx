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
  onChange?: (value: string) => void;
  children: ReactNode;
};

type OptionShape = { value: string; label: ReactNode };

export const Select = forwardRef<HTMLDivElement, SelectProps>((props, ref) => {
  const {
    className = '',
    children,
    value,
    defaultValue,
    onChange,
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

  const { open: isOpen, toggle, close, setOpen } = useDisclosure({ defaultOpen: false });
  const [highlightedIndex, setHighlightedIndex] = useState<number>(0);

  const handleSelect = (next: string): void => {
    if (value === undefined) {
      setInternalValue(next);
    }
    onChange?.(next);
    close();
  };

  const moveHighlight = (direction: 1 | -1): void => {
    setHighlightedIndex((prev) => {
      const next = prev + direction;
      if (next < 0) return 0;
      if (next >= options.length) return options.length - 1;
      return next;
    });
  };

  return (
    <div className={`ui-select-custom ${className}`.trim()} ref={ref}>
      <button
        type="button"
        className="ui-select ui-select-trigger"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={isOpen ? 'select-listbox' : undefined}
        disabled={disabled}
        onClick={() => {
          toggle();
        }}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (!isOpen) {
              setOpen(true);
              setHighlightedIndex(options.findIndex((opt) => opt.value === currentValue));
            } else {
              moveHighlight(1);
            }
          } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            if (isOpen) {
              moveHighlight(-1);
            }
          } else if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            if (isOpen) {
              const highlighted = options[highlightedIndex];
              if (highlighted) {
                handleSelect(highlighted.value);
              }
            } else {
              setOpen(true);
            }
          } else if (e.key === 'Escape') {
            e.preventDefault();
            close();
          } else if (e.key === 'Tab') {
            close();
          } else if (e.key === 'Home' && isOpen) {
            e.preventDefault();
            setHighlightedIndex(0);
          } else if (e.key === 'End' && isOpen) {
            e.preventDefault();
            setHighlightedIndex(options.length - 1);
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
        <div id="select-listbox" className="ui-select-menu" role="listbox">
          {options.map((opt, index) => (
            <div
              key={opt.value}
              id={`select-option-${String(index)}`}
              role="option"
              aria-selected={opt.value === currentValue}
              className="ui-select-option"
              data-selected={opt.value === currentValue}
              data-highlighted={index === highlightedIndex}
              onClick={() => {
                handleSelect(opt.value);
              }}
              onMouseEnter={() => {
                setHighlightedIndex(index);
              }}
            >
              {opt.label}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
});

Select.displayName = 'Select';
