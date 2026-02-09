// src/apps/web/src/app/layouts/AppLeftMenu.tsx
import { Link, MenuItem, ScrollArea, Text } from '@abe-stack/ui';

import type { ReactElement } from 'react';

type MenuLink = {
  label: string;
  to: string;
};

const MENU_LINKS: MenuLink[] = [
  { label: 'Home', to: '/' },
  { label: 'UI Library', to: '/ui-library' },
  { label: 'Dashboard', to: '/dashboard' },
  { label: 'Settings', to: '/settings' },
  { label: 'Profile', to: '/settings/accounts' },
  { label: 'Billing', to: '/settings/billing' },
  { label: 'Auth', to: '/auth' },
  { label: 'Admin', to: '/admin' },
];

export const AppLeftMenu = (): ReactElement => {
  return (
    <ScrollArea className="scroll-flex">
      <div className="flex-col gap-1 p-2">
        <Text className="text-xs font-semibold text-muted uppercase tracking-wide px-2 pt-2 pb-2">
          Menu
        </Text>
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
