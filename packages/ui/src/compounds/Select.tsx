import {
  Children,
  forwardRef,
  isValidElement,
  useId,
  useMemo,
  useRef,
  useState,
  type ComponentPropsWithoutRef,
  type ReactNode,
} from 'react';

import { useControllableState } from '../hooks/useControllableState';
import { useDisclosure } from '../hooks/useDisclosure';
import '../styles/elements.css';

type SelectProps = Omit<
  ComponentPropsWithoutRef<'button'>,
  'value' | 'defaultValue' | 'onChange'
> & {
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  children: ReactNode;
};

type OptionShape = { value: string; label: ReactNode; disabled?: boolean };

export const Select = forwardRef<HTMLDivElement, SelectProps>((props, ref) => {
  const {
    className = '',
    children,
    value: valueProp,
    defaultValue,
    onChange,
    onBlur,
    name,
    disabled,
    id: idProp,
    ...rest
  } = props;

  const generatedId = useId();
  const id = idProp || generatedId;
  const listboxId = `${id}-listbox`;
  const triggerRef = useRef<HTMLButtonElement>(null);

  const options = useMemo<OptionShape[]>(() => {
    return Children.toArray(children)
      .map((child) => {
        if (isValidElement<ComponentPropsWithoutRef<'option'>>(child) && child.type === 'option') {
          const label = child.props.children;
          const fallbackValue =
            typeof label === 'string' || typeof label === 'number' ? String(label) : '';
          const val = child.props.value ?? fallbackValue;
          return { value: val, label, disabled: child.props.disabled };
        }
        return null;
      })
      .filter(Boolean) as OptionShape[];
  }, [children]);

  const [value, setValue] = useControllableState({
    value: valueProp,
    defaultValue: defaultValue ?? options[0]?.value ?? '',
    onChange,
  });

  const currentLabel = options.find((opt) => opt.value === value)?.label ?? value;

  const { open: isOpen, toggle, close, setOpen } = useDisclosure({ defaultOpen: false });
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);

  const handleSelect = (next: string): void => {
    setValue(next);
    close();
    triggerRef.current?.focus();
  };

  const setInitialHighlight = (): void => {
    const currentIndex = options.findIndex((opt) => opt.value === value);
    setHighlightedIndex(
      currentIndex >= 0 && !options[currentIndex]?.disabled
        ? currentIndex
        : options.findIndex((o) => !o.disabled),
    );
  };

  const moveHighlight = (direction: 1 | -1): void => {
    const enabledIndices = options
      .map((opt, index) => (opt.disabled ? -1 : index))
      .filter((i) => i !== -1);

    if (enabledIndices.length === 0) return;

    setHighlightedIndex((prev) => {
      const currentPos = enabledIndices.indexOf(prev);
      let nextPos: number;

      if (currentPos === -1) {
        nextPos = direction === 1 ? 0 : enabledIndices.length - 1;
      } else {
        nextPos = (currentPos + direction + enabledIndices.length) % enabledIndices.length;
      }

      return enabledIndices[nextPos] ?? 0;
    });
  };

  return (
    <div className={`ui-select-custom ${className}`.trim()} ref={ref}>
      <button
        ref={triggerRef}
        type="button"
        id={id}
        className="ui-select ui-select-trigger"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={isOpen ? listboxId : undefined}
        aria-activedescendant={
          isOpen && highlightedIndex >= 0 ? `${id}-option-${String(highlightedIndex)}` : undefined
        }
        disabled={disabled}
        onClick={() => {
          if (!disabled) {
            const nextOpen = !isOpen;
            toggle();
            if (nextOpen) {
              setInitialHighlight();
            }
          }
        }}
        onKeyDown={(e) => {
          if (disabled) return;

          switch (e.key) {
            case 'ArrowDown':
              e.preventDefault();
              if (!isOpen) {
                setOpen(true);
                setInitialHighlight();
              } else {
                moveHighlight(1);
              }
              break;
            case 'ArrowUp':
              e.preventDefault();
              if (isOpen) {
                moveHighlight(-1);
              }
              break;
            case 'Enter':
            case ' ':
              e.preventDefault();
              if (isOpen) {
                const highlighted = options[highlightedIndex];
                if (highlighted && !highlighted.disabled) {
                  handleSelect(highlighted.value);
                }
              } else {
                setOpen(true);
                setInitialHighlight();
              }
              break;
            case 'Escape':
              if (isOpen) {
                e.preventDefault();
                close();
                triggerRef.current?.focus();
              }
              break;
            case 'Tab':
              close();
              break;
            case 'Home':
              if (isOpen) {
                e.preventDefault();
                setHighlightedIndex(options.findIndex((o) => !o.disabled));
              }
              break;
            case 'End':
              if (isOpen) {
                e.preventDefault();
                const lastEnabled = [...options].reverse().findIndex((o) => !o.disabled);
                if (lastEnabled !== -1) {
                  setHighlightedIndex(options.length - 1 - lastEnabled);
                }
              }
              break;
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
        <div id={listboxId} className="ui-select-menu" role="listbox" aria-labelledby={id}>
          {options.map((opt, index) => (
            <div
              key={opt.value}
              id={`${id}-option-${String(index)}`}
              role="option"
              aria-selected={opt.value === value}
              aria-disabled={opt.disabled}
              className="ui-select-option"
              data-selected={opt.value === value}
              data-highlighted={index === highlightedIndex}
              data-disabled={opt.disabled}
              onClick={() => {
                if (!opt.disabled) {
                  handleSelect(opt.value);
                }
              }}
              onMouseEnter={() => {
                if (!opt.disabled) {
                  setHighlightedIndex(index);
                }
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

Select.displayName = 'Select';
