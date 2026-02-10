// src/apps/web/src/features/ui-library/components/SidePeekUILibraryContent.tsx
import { Markdown } from '@abe-stack/ui';

import type { ReactElement } from 'react';

const SIDE_PEEK_MARKDOWN = `This is a **Notion-style side peek** panel. It slides in from the right and keeps the background visible.

## Features
- URL-synced state (try refreshing!)
- Smooth CSS transitions
- Click overlay or press Escape to close
- Fullscreen toggle button in header
- Multiple size variants (sm, md, lg, xl, full)
- Focus trap for accessibility

## Usage
\`\`\`tsx
import { SidePeek, useSidePeek } from '@abe-stack/ui';

const { isOpen, open, close } = useSidePeek();

<button onClick={() => open('/details')}>
  Open Side Peek
</button>

<SidePeek.Root open={isOpen} onClose={close}>
  <SidePeek.Header>
    <SidePeek.Title>Title</SidePeek.Title>
    <SidePeek.Close />
  </SidePeek.Header>
  <SidePeek.Content>
    Your content here
  </SidePeek.Content>
</SidePeek.Root>
\`\`\``;

export const SidePeekUILibraryContent = (): ReactElement => {
  return (
    <div className="space-y-4">
      <Markdown className="markdown-content">{SIDE_PEEK_MARKDOWN}</Markdown>
    </div>
  );
};
