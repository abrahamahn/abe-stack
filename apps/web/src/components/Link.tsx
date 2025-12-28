import React from 'react';
import type { ComponentPropsWithoutRef } from 'react';
import { useNavigate } from 'react-router-dom';

interface LinkProps extends ComponentPropsWithoutRef<'a'> {
  to: string;
}

export function Link({ to, onClick, ...props }: LinkProps) {
  const navigate = useNavigate();

  const handleClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    if (onClick) {
      onClick(event);
    }
    void navigate(to);
  };

  return <a {...props} href={to} onClick={handleClick} />;
}
