// main/apps/web/src/features/home/hooks/useDocContent.ts
import { useEffect, useState } from 'react';

import { loadDocContent } from '../data/docsMeta';

import type { DocKey } from '../types';

/** Return type for the useDocContent hook. */
export interface UseDocContentResult {
  /** The loaded markdown content, or null if not yet loaded */
  content: string | null;
  /** Whether content is currently being fetched */
  isLoading: boolean;
}

/**
 * Loads and caches markdown documentation content for a given doc key.
 * Uses an in-memory Map cache to avoid re-fetching previously loaded docs.
 *
 * @param key - The document identifier to load
 * @returns The content string and loading state
 * @complexity O(1) - Map lookup + single async import per unique key
 */
export function useDocContent(key: DocKey): UseDocContentResult {
  const [content, setContent] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [cache] = useState<Map<DocKey, string>>(() => new Map());

  useEffect(() => {
    const cached = cache.get(key);
    if (cached !== undefined) {
      queueMicrotask(() => {
        setContent(cached);
        setIsLoading(false);
      });
      return;
    }

    queueMicrotask(() => {
      setIsLoading(true);
    });
    loadDocContent(key)
      .then((loaded) => {
        cache.set(key, loaded);
        setContent(loaded);
      })
      .catch(() => {
        setContent('Failed to load documentation.');
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [key, cache]);

  return { content, isLoading };
}
