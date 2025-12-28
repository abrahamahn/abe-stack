import React, { ComponentPropsWithoutRef } from 'react';

interface MenuItemProps extends ComponentPropsWithoutRef<'div'> {
  selected?: boolean;
  onSubmit?: () => void;
}

export function MenuItem({ selected, onSubmit, style, ...props }: MenuItemProps) {
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && onSubmit) {
      event.preventDefault();
      onSubmit();
    }
  };

  return (
    <div
      role="menuitem"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      style={{
        padding: '0.5rem 1rem',
        cursor: 'pointer',
        backgroundColor: selected ? '#e2e8f0' : 'transparent',
        transition: 'background-color 0.2s ease',
        ...style,
      }}
      {...props}
    />
  );
}
