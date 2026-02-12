// src/apps/web/src/features/home/components/HomeRightSidebar.tsx
import { Link, useSearchParams } from '@abe-stack/react/router';
import { Text } from '@abe-stack/ui';
import { useMemo } from 'react';

import { docCategories, docsMeta } from '../data';

import type { ReactElement } from 'react';

/**
 * Right sidebar for the home page.
 * Displays available documentation grouped by category as clickable links.
 *
 * @returns Document list element
 * @complexity O(n) where n = number of docs
 */
export const HomeRightSidebar = (): ReactElement => {
  const [searchParams] = useSearchParams();
  const activeDoc = searchParams.get('doc') ?? 'readme';

  const groupedDocs = useMemo(() => {
    const groups = new Map<string, { key: string; label: string }[]>();
    for (const [key, meta] of Object.entries(docsMeta)) {
      const existing = groups.get(meta.category) ?? [];
      existing.push({ key, label: meta.label });
      groups.set(meta.category, existing);
    }
    // Sort each category: "Overview" pinned first, rest alphabetical
    for (const [cat, docs] of groups) {
      docs.sort((a, b) => {
        if (a.label === 'Overview') return -1;
        if (b.label === 'Overview') return 1;
        return a.label.localeCompare(b.label);
      });
      groups.set(cat, docs);
    }
    return groups;
  }, []);

  return (
    <nav className="p-4 flex flex-col gap-4" aria-label="Documentation">
      <Text tone="muted" className="text-xs uppercase tracking-wide">
        Documentation
      </Text>
      {docCategories.map((cat) => {
        const docs = groupedDocs.get(cat.key);
        if (docs === undefined || docs.length === 0) return null;
        return (
          <div key={cat.key} className="flex flex-col gap-1">
            <Text size="sm" className="font-medium">
              {cat.label}
            </Text>
            {docs.map((doc) => {
              const isActive = doc.key === activeDoc;
              const href = doc.key === 'readme' ? '/' : `/?doc=${doc.key}`;
              return (
                <Link
                  key={doc.key}
                  to={href}
                  className={`pl-2 text-sm ${isActive ? 'font-medium' : 'text-muted'}`}
                >
                  {doc.label}
                </Link>
              );
            })}
          </div>
        );
      })}
    </nav>
  );
};
