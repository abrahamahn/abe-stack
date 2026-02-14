// main/shared/src/utils/fs.ts
/**
 * Filesystem utilities.
 *
 * NOTE: These utilities use `node:path` and are intended for server-side
 * or Node.js environment usage within the shared package.
 */

import { isAbsolute, normalize, relative, resolve } from 'node:path';

/**
 * Check if a path is safe (no directory traversal outside the root).
 *
 * @param rootPath - The root directory path
 * @param requestedPath - The requested relative path
 * @returns true if the resolved path stays within the root
 */
export function isSafePath(rootPath: string, requestedPath: string): boolean {
  const normalizedPath = normalize(requestedPath);
  const fullPath = resolve(rootPath, normalizedPath);
  const resolvedRoot = resolve(rootPath);
  const rel = relative(resolvedRoot, fullPath);

  return rel !== '' && !rel.startsWith('..') && !isAbsolute(rel);
}
