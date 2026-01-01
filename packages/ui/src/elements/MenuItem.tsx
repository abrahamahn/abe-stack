import { forwardRef, type ComponentPropsWithoutRef } from 'react';
import '../styles/elements.css';

type MenuItemProps = ComponentPropsWithoutRef<'button'>;

export const MenuItem = forwardRef<HTMLButtonElement, MenuItemProps>((props, ref) => {
  const { className = '', type = 'button', ...rest } = props;
  return <button ref={ref} type={type} className={`ui-menu-item ${className}`.trim()} {...rest} />;
});

MenuItem.displayName = 'MenuItem';
