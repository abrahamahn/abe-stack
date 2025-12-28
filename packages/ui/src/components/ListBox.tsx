import React, { ComponentPropsWithoutRef } from 'react';

interface ListBoxProps<T> {
  items: T[];
  selectedIndex: number;
  onSelectIndex: (index: number) => void;
  children: (item: T, props: ListItemProps) => React.ReactNode;
  autoFocus?: boolean;
}

interface ListItemProps extends ComponentPropsWithoutRef<'div'> {
  selected?: boolean;
}

export function ListBox<T>({
  items,
  selectedIndex,
  onSelectIndex,
  children,
  autoFocus,
}: ListBoxProps<T>) {
  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (autoFocus) {
      containerRef.current?.focus();
    }
  }, [autoFocus]);

  const handleKeyDown = (event: React.KeyboardEvent) => {
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        onSelectIndex((selectedIndex + 1) % items.length);
        break;
      case 'ArrowUp':
        event.preventDefault();
        onSelectIndex((selectedIndex - 1 + items.length) % items.length);
        break;
      case 'Enter':
        event.preventDefault();
        // Handle selection
        break;
    }
  };

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      style={{
        outline: 'none',
      }}
    >
      {items.map((item, index) =>
        children(item, {
          key: index,
          onClick: () => onSelectIndex(index),
          selected: index === selectedIndex,
        }),
      )}
    </div>
  );
}

export function ListItem({ selected, style, ...props }: ListItemProps) {
  return (
    <div
      {...props}
      style={{
        cursor: 'pointer',
        backgroundColor: selected ? '#e2e8f0' : 'transparent',
        transition: 'background-color 0.2s ease',
        ...style,
      }}
    />
  );
}
