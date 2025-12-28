import React from 'react';

import { useClientEnvironment } from '../services/ClientEnvironment';
import type { Route } from '../services/Router';
import { useRoute } from '../services/Router';

interface LinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  to: string;
  activeStyle?: React.CSSProperties;
  activeClass?: string;
}

export function Link({
  to,
  activeStyle,
  activeClass,
  style,
  className,
  onClick,
  ...props
}: LinkProps) {
  const environment = useClientEnvironment();
  const route = useRoute();

  // Determine if this link is active based on the current route
  const isActive = isLinkActive(route, to);

  const handleClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    if (onClick) {
      onClick(event);
    }
    environment.router.navigate(to);
  };

  return (
    <a
      {...props}
      href={to}
      onClick={handleClick}
      style={{
        ...style,
        ...(isActive ? activeStyle : {}),
      }}
      className={`${className || ''} ${isActive ? activeClass || '' : ''}`}
    />
  );
}

// Helper function to determine if a link is active based on the current route
function isLinkActive(route: Route, to: string): boolean {
  if (to === '/' && route.type === 'root') {
    return true;
  }

  if (to === '/home' && route.type === 'home') {
    return true;
  }

  if (to === '/media' && route.type === 'media') {
    return true;
  }

  if (to === '/social' && route.type === 'social') {
    return true;
  }

  if (to === '/settings' && route.type === 'settings') {
    return true;
  }

  if (to === '/dashboard' && route.type === 'dashboard') {
    return true;
  }

  if (to === '/profile' && route.type === 'profile') {
    return true;
  }

  if (to === '/upload' && route.type === 'upload') {
    return true;
  }

  if (to === '/explore' && route.type === 'explore') {
    return true;
  }

  if (to === '/notifications' && route.type === 'notifications') {
    return true;
  }

  if (to.startsWith('/design/') && route.type === 'design') {
    return to.slice('/design/'.length) === route.page;
  }

  return false;
}
