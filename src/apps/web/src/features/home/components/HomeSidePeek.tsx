// src/apps/web/src/features/home/components/HomeSidePeek.tsx
import { SidePeek, Text } from '@abe-stack/ui';

import type { ReactElement } from 'react';

export interface HomeSidePeekProps {
  open: boolean;
  onClose: () => void;
}

export const HomeSidePeek = ({ open, onClose }: HomeSidePeekProps): ReactElement => {
  return (
    <SidePeek.Root open={open} onClose={onClose} size="md">
      <SidePeek.Header>
        <SidePeek.Title>Side Peek UI Library</SidePeek.Title>
        <div className="flex gap-2">
          <SidePeek.Expand to="/side-peek-ui-library" />
          <SidePeek.Close />
        </div>
      </SidePeek.Header>
      <SidePeek.Content>
        <Text tone="muted">Side peek content</Text>
      </SidePeek.Content>
    </SidePeek.Root>
  );
};
