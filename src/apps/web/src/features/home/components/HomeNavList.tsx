// apps/web/src/features/home/components/HomeNavList.tsx
import { Button, Link, MenuItem, ScrollArea, Text } from '@abe-stack/ui';

import { docCategories, docsMeta } from '../data';

import type { DocKey, DocMeta } from '../types';
import type { ReactElement } from 'react';

/** Props for the HomeNavList component. */
export interface HomeNavListProps {
  /** Currently selected document key */
  activeDoc: DocKey;
  /** Callback when a document is selected */
  onSelectDoc: (key: DocKey) => void;
}

/**
 * Navigation sidebar list for the Home page.
 * Shows page links (UI Library, Dashboard) and grouped document entries from docsMeta.
 *
 * @param props - HomeNavListProps
 * @returns Scrollable navigation list element
 * @complexity O(n) where n = total number of documents across all categories
 */
export const HomeNavList = ({ activeDoc, onSelectDoc }: HomeNavListProps): ReactElement => {
  return (
    <ScrollArea className="scroll-flex">
      <div className="flex-col gap-1 p-2">
        {/* Page Links */}
        <Text className="text-xs font-semibold text-muted uppercase tracking-wide px-2 pt-2">
          Pages
        </Text>
        <Link to="/ui-library" className="no-underline">
          <MenuItem>
            <Text>UI Library</Text>
          </MenuItem>
        </Link>
        <Link to="/dashboard" className="no-underline">
          <MenuItem>
            <Text>Dashboard</Text>
          </MenuItem>
        </Link>

        {/* Doc Categories */}
        {docCategories.map((cat) => (
          <div key={cat.key} className="flex flex-col gap-1">
            <Text className="text-xs font-semibold text-muted uppercase tracking-wide px-2 pt-3">
              {cat.label}
            </Text>
            {(Object.entries(docsMeta) as [DocKey, DocMeta][])
              .filter(([, doc]) => doc.category === cat.key)
              .map(([key, doc]) => (
                <Button
                  key={key}
                  variant={activeDoc === key ? 'primary' : 'text'}
                  size="small"
                  onClick={() => {
                    onSelectDoc(key);
                  }}
                  className="w-full justify-start text-left"
                >
                  {doc.label}
                </Button>
              ))}
          </div>
        ))}
      </div>
    </ScrollArea>
  );
};
