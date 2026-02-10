// src/apps/web/src/app/layouts/AppLeftMenu.tsx
import { Link, MenuItem, ScrollArea, Text } from '@abe-stack/ui';

import type { ReactElement } from 'react';

type MenuLink = {
  label: string;
  to: string;
};

const MENU_LINKS: MenuLink[] = [
  { label: 'Home', to: '/' },
  { label: 'Dashboard', to: '/dashboard' },
  { label: 'Workspaces', to: '/workspaces' },
  { label: 'Settings', to: '/settings' },
  { label: 'Pricing', to: '/pricing' },
  { label: 'Admin', to: '/admin' },
  { label: 'UI Library', to: '/ui-library' },
];

export const AppLeftMenu = (): ReactElement => {
  return (
    <ScrollArea className="scroll-flex">
      <div className="flex-col gap-1 p-2">
        {MENU_LINKS.map((link) => (
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
