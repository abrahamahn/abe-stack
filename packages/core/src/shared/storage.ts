// packages/core/src/shared/storage.ts
/**
 * Normalizes a storage key by stripping leading slashes and optionally removing path traversal sequences.
 *
 * @param key - The storage key to normalize
 * @param stripParentRefs - If true, also removes ".." sequences (default: false)
 * @returns The normalized key
 */
export function normalizeStorageKey(key: string, stripParentRefs = false): string {
  let normalized = key.replace(/^\//, '');
  if (stripParentRefs) {
    normalized = normalized.replace(/\.\./g, '');
  }
  return normalized;
}
