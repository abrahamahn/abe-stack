// main/apps/web/src/app/layouts/AppLeftMenu.tsx
import { Link } from '@abe-stack/react/router';
import { isAdmin } from '@abe-stack/shared';
import { MenuItem, ScrollArea, Text } from '@abe-stack/ui';
import { FeatureHint } from '@app/components';
import { useAuth } from '@features/auth';
import { useMemo } from 'react';

import type { FeatureHintProps } from '@app/components';
import type { ReactElement } from 'react';

type MenuLink = {
  label: string;
  to: string;
};

type HintConfig = Pick<FeatureHintProps, 'featureKey' | 'title' | 'description' | 'placement'>;

const HINT_MAP: Record<string, HintConfig> = {
  Workspaces: {
    featureKey: 'workspaces',
    title: 'Workspaces',
    description: 'Organize your team and projects into workspaces',
    placement: 'right',
  },
  Activities: {
    featureKey: 'activities',
    title: 'Activities',
    description: 'Track all actions across your account',
    placement: 'right',
  },
  Settings: {
    featureKey: 'settings',
    title: 'Settings',
    description: 'Customize your profile, security, and preferences',
    placement: 'right',
  },
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
    if (user != null && isAdmin(user.role)) {
      result.push(...ADMIN_LINKS);
    }
    return result;
  }, [isAuthenticated, user]);

  return (
    <ScrollArea className="scroll-flex">
      <div className="flex-col gap-1 p-2">
        {links.map((link) => {
          const hint = HINT_MAP[link.label];
          const menuItem = (
            <Link key={link.label} to={link.to} className="no-underline">
              <MenuItem>
                <Text>{link.label}</Text>
              </MenuItem>
            </Link>
          );
          if (hint === undefined) return menuItem;
          return (
            <FeatureHint key={link.label} {...hint}>
              {menuItem}
            </FeatureHint>
          );
        })}
      </div>
    </ScrollArea>
  );
};
