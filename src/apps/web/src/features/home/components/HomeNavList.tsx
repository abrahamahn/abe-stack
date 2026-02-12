// src/apps/web/src/features/home/components/HomeNavList.tsx
import { Link } from '@abe-stack/react/router';
import { MenuItem, ScrollArea, Text } from '@abe-stack/ui';

import type { ReactElement } from 'react';

type HomeMenuLink = {
  label: string;
  to: string;
};

const HOME_MENU_LINKS: HomeMenuLink[] = [
  { label: 'Dashboard', to: '/dashboard' },
  { label: 'Settings', to: '/settings' },
  { label: 'Pricing', to: '/pricing' },
  { label: 'Admin', to: '/admin' },
];

export type HomeNavListProps = Record<string, never>;

/**
 * Right-side app menu for the Home page.
 * @returns Scrollable navigation list element
 * @complexity O(n) where n = number of menu links
 */
export const HomeNavList = (): ReactElement => {
  return (
    <ScrollArea className="scroll-flex">
      <div className="flex-col gap-1 p-2">
        <Text className="text-xs font-semibold text-muted uppercase tracking-wide px-2 pt-2 pb-2">
          Menu
        </Text>
        {HOME_MENU_LINKS.map((link) => (
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
