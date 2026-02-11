// src/apps/web/src/app/layouts/AppLeftMenu.tsx
import { Link, MenuItem, ScrollArea, Text } from '@abe-stack/ui';
import { useAuth } from '@features/auth';
import { useMemo } from 'react';

import type { ReactElement } from 'react';

type MenuLink = {
  label: string;
  to: string;
};

const PUBLIC_LINKS: MenuLink[] = [
  { label: 'Home', to: '/' },
  { label: 'Pricing', to: '/pricing' },
  { label: 'UI Library', to: '/ui-library' },
];

const AUTH_LINKS: MenuLink[] = [
  { label: 'Dashboard', to: '/dashboard' },
  { label: 'Activities', to: '/activities' },
  { label: 'Workspaces', to: '/workspaces' },
  { label: 'Settings', to: '/settings' },
];

const ADMIN_LINKS: MenuLink[] = [{ label: 'Admin', to: '/admin' }];

export const AppLeftMenu = (): ReactElement => {
  const { isAuthenticated, user } = useAuth();

  const links = useMemo(() => {
    const result = [...PUBLIC_LINKS];
    if (isAuthenticated) {
      result.push(...AUTH_LINKS);
    }
    if (user?.role === 'admin') {
      result.push(...ADMIN_LINKS);
    }
    return result;
  }, [isAuthenticated, user?.role]);

  return (
    <ScrollArea className="scroll-flex">
      <div className="flex-col gap-1 p-2">
        {links.map((link) => (
          <Link key={link.label} to={link.to} className="no-underline">
            <MenuItem>
              <Text>{link.label}</Text>
            </MenuItem>
          </Link>
        ))}
      </div>
    </ScrollArea>
  );
};
