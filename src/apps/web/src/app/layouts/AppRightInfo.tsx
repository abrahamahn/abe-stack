// src/apps/web/src/app/layouts/AppRightInfo.tsx
import { Text, useLocation } from '@abe-stack/ui';

import type { ReactElement } from 'react';

export const AppRightInfo = (): ReactElement => {
  const location = useLocation();

  return (
    <div className="p-4 flex flex-col gap-3">
      <Text tone="muted" className="text-xs uppercase tracking-wide">
        Current Route
      </Text>
      <Text>{location.pathname}</Text>
      <Text tone="muted">Persistent app shell panel shared across all pages.</Text>
    </div>
  );
};
