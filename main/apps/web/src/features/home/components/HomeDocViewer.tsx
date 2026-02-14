// main/apps/web/src/features/home/components/HomeDocViewer.tsx
import { useDelayedFlag } from '@abe-stack/react/hooks';
import { Heading, Markdown, Skeleton, Text } from '@abe-stack/ui';

import type { ReactElement } from 'react';

/** Props for the HomeDocViewer component. */
export interface HomeDocViewerProps {
  /** Currently selected document key, or null for welcome screen */
  selectedDoc: string | null;
  /** Loaded markdown content, or null if not yet loaded */
  content: string | null;
  /** Whether content is currently being fetched */
  isLoading: boolean;
}

/**
 * Center panel content for the Home page.
 * Renders the selected document's markdown content, a loading skeleton,
 * or a welcome message when no document is selected.
 *
 * @param props - HomeDocViewerProps
 * @returns Document viewer element
 * @complexity O(1) - single render based on state
 */
export const HomeDocViewer = ({
  selectedDoc,
  content,
  isLoading,
}: HomeDocViewerProps): ReactElement => {
  const showSkeleton = useDelayedFlag(isLoading, 150);

  if (selectedDoc === null) {
    return (
      <div className="p-2 flex flex-col gap-3">
        <Heading as="h2" size="lg">
          Welcome
        </Heading>
        <Text tone="muted">Select a document from the left panel to view its content.</Text>
      </div>
    );
  }

  return (
    <div className="p-2">
      {showSkeleton ? (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-5/6" />
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <Markdown className="markdown-content">{content ?? ''}</Markdown>
        </div>
      )}
    </div>
  );
};
