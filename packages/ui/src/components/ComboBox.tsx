import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';

import { Button } from './Button';
import { FuzzyString } from './FuzzyString';
import { Input } from './Input';
import { MenuItem } from './MenuItem';
import { Popup, PopupFrame } from './Popup';
import { fuzzyMatch } from '@abe-stack/shared';
import { useRefPrevious } from '../hooks/useRefPrevious';
import { isShortcut } from '../hooks/useShortcut';

interface ComboBoxProps<T> {
  items: T[];
  renderItem: (item: T) => React.ReactNode;
  onSelect: (item: T) => void;
  value?: T;
  placeholder?: string;
  onChange?: (value: T) => void;
}

export function ComboBox<T>({
  items,
  renderItem,
  onSelect,
  value,
  placeholder,
  onChange,
}: ComboBoxProps<T>) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const filteredItems = items.filter((item) => {
    const renderedItem = renderItem(item);
    if (typeof renderedItem === 'string') {
      return renderedItem.toLowerCase().includes(search.toLowerCase());
    }
    return true; // Skip filtering for non-string items
  });

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (buttonRef.current && !buttonRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleSelect = (item: T) => {
    onSelect(item);
    onChange?.(item);
    setOpen(false);
    setSearch('');
  };

  return (
    <div>
      <Button ref={buttonRef} onClick={() => setOpen(!open)}>
        {value ? renderItem(value) : placeholder || 'Select...'}
      </Button>
      {open && buttonRef.current && (
        <Popup open={open} anchor={buttonRef.current} onDismiss={() => setOpen(false)}>
          <div
            style={{
              padding: '0.5rem',
              backgroundColor: 'white',
              borderRadius: '0.25rem',
              boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
            }}
          >
            <div style={{ marginBottom: '0.5rem' }}>
              <Input
                value={search}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
                placeholder="Search..."
              />
            </div>
            <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
              {filteredItems.map((item, index) => (
                <div
                  key={index}
                  onClick={() => handleSelect(item)}
                  onMouseEnter={() => setHoveredIndex(index)}
                  onMouseLeave={() => setHoveredIndex(null)}
                  style={{
                    padding: '0.5rem',
                    cursor: 'pointer',
                    backgroundColor:
                      value === item || hoveredIndex === index ? '#e2e8f0' : 'transparent',
                    transition: 'background-color 0.2s ease',
                  }}
                >
                  {renderItem(item)}
                </div>
              ))}
            </div>
          </div>
        </Popup>
      )}
    </div>
  );
}

export function ComboBoxSelect(props: {
  items: string[];
  placeholder: string;
  value: string | undefined;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const prevOpen = useRefPrevious(open);

  useLayoutEffect(() => {
    if (prevOpen.current && !open) {
      buttonRef.current?.focus();
    }
  }, [prevOpen, open]);

  if (open) {
    return (
      <ComboBoxSearch
        autoFocus
        items={props.items}
        value={props.value}
        onChange={(newValue: string) => {
          props.onChange(newValue);
          setOpen(false);
        }}
        onDismiss={() => {
          setOpen(false);
        }}
      />
    );
  }

  return (
    <Button ref={buttonRef} onClick={() => setOpen(true)} style={{ textAlign: 'left' }}>
      {props.value || <span style={{ color: 'var(--text-color2' }}>{props.placeholder} </span>}{' '}
      <span style={{ fontSize: '0.7rem', verticalAlign: 'middle' }}>▼</span>
    </Button>
  );
}

export function ComboBoxSearch(props: {
  items: string[];
  value: string | undefined;
  onChange: (value: string) => void;
  onDismiss?: () => void;
  autoFocus?: boolean;
  notice?: React.ReactNode;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (props.autoFocus) inputRef.current?.focus();
  }, [props.autoFocus]);

  const [text, setText] = useState('');

  const filteredItems = useMemo(() => {
    return props.items
      .map((str) => ({ value: str, match: fuzzyMatch(text, str) || undefined }))
      .filter(({ match }) => Boolean(match));
  }, [text, props.items]);

  const [selectedIndex, setSelectedIndex] = useState(0);

  const handleKeydown = (event: React.KeyboardEvent) => {
    if (isShortcut('down', event.nativeEvent)) {
      event.preventDefault();
      setSelectedIndex((i) => {
        if (i >= filteredItems.length - 1) return filteredItems.length - 1;
        else return i + 1;
      });
      return;
    }
    if (isShortcut('up', event.nativeEvent)) {
      event.preventDefault();
      setSelectedIndex((i) => {
        if (i === 0) return i;
        else return i - 1;
      });
      return;
    }
    if (isShortcut('enter', event.nativeEvent)) {
      event.preventDefault();
      if (filteredItems[selectedIndex]) {
        props.onChange(filteredItems[selectedIndex].value);
      }
      return;
    }
    if (isShortcut('escape', event.nativeEvent)) {
      event.preventDefault();
      props.onDismiss?.();
      return;
    }
  };

  // TODO: filter selected on key change to maintain selectedIndex position?
  return (
    <>
      <Input
        ref={inputRef}
        onFocus={() => setFocused(true)}
        onBlur={() => {
          setFocused(false);
          props.onDismiss?.();
        }}
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          setSelectedIndex(0);
        }}
        onKeyDown={handleKeydown}
      />

      <Popup
        open={focused && filteredItems.length > 0}
        anchor={inputRef.current}
        onDismiss={props.onDismiss}
      >
        <PopupFrame>
          {props.notice}
          {filteredItems.map((item, i) => (
            <MenuItem
              key={item.value}
              selected={selectedIndex === i}
              onClick={() => props.onChange(item.value)}
              onMouseDown={(e) => e.preventDefault()}
              onMouseEnter={() => setSelectedIndex(i)}
            >
              <FuzzyString match={item.match} />
            </MenuItem>
          ))}
        </PopupFrame>
      </Popup>
    </>
  );
}
