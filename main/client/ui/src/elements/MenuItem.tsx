// main/client/ui/src/elements/MenuItem.tsx
import { forwardRef, type ComponentPropsWithoutRef } from 'react';

import { Button } from './Button';

import '../styles/elements.css';

type MenuItemProps = ComponentPropsWithoutRef<'button'>;

/**
 * A styled button for menu items in dropdowns and navigation menus.
 *
 * @example
 * ```tsx
 * <MenuItem onClick={handleEdit}>Edit</MenuItem>
 * ```
 */
export const MenuItem = forwardRef<HTMLButtonElement, MenuItemProps>((props, ref) => {
  const { className = '', type = 'button', ...rest } = props;
  return (
    <Button ref={ref as any} type={type} className={`menu-item ${className}`.trim()} {...rest} />
  );
});

MenuItem.displayName = 'MenuItem';
