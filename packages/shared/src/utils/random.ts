/**
 * Generate a random ID
 * @param prefix Optional prefix for the ID
 * @returns A random string ID
 */
export function randomId(prefix = ''): string {
  const random = Math.random().toString(36).substring(2, 15);
  const timestamp = Date.now().toString(36);
  return prefix ? `${prefix}-${timestamp}-${random}` : `${timestamp}-${random}`;
}
