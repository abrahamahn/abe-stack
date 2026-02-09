// src/apps/web/src/features/home/components/HomeRightSidebar.tsx
import { Text } from '@abe-stack/ui';

import type { DocKey } from '../types';
import type { ReactElement } from 'react';

export interface HomeRightSidebarProps {
  selectedDoc: DocKey | null;
}

export const HomeRightSidebar = ({ selectedDoc }: HomeRightSidebarProps): ReactElement => {
  return (
    <div className="p-4">
      <Text tone="muted">Right panel placeholder for {selectedDoc ?? 'none'}</Text>
    </div>
  );
};
