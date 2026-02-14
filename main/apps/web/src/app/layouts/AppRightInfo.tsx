// main/apps/web/src/app/layouts/AppRightInfo.tsx
import { useLocation } from '@abe-stack/react/router';
import { Text } from '@abe-stack/ui';
import { HomeRightSidebar } from '@features/home/components';

import type { ReactElement } from 'react';

export const AppRightInfo = (): ReactElement => {
  const location = useLocation();

  if (location.pathname === '/' || location.pathname === '/clean') {
    return <HomeRightSidebar />;
  }

  return (
    <div className="p-4 flex flex-col gap-3">
      <Text tone="muted" className="text-xs uppercase tracking-wide">
        Current Route
      </Text>
      <Text>{location.pathname}</Text>
    </div>
  );
};
