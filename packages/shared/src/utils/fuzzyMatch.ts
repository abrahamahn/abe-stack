/**
 * Result of a fuzzy match operation
 */
export type FuzzyMatchResult = { match: string } | { skip: string };

/**
 * Simple fuzzy string matching
 * Returns true if all characters in the search string appear in order in the target string
 */
export function fuzzyMatch(search: string, target: string): boolean {
  const searchLower = search.toLowerCase();
  const targetLower = target.toLowerCase();

  let searchIndex = 0;
  let targetIndex = 0;

  while (searchIndex < searchLower.length && targetIndex < targetLower.length) {
    if (searchLower[searchIndex] === targetLower[targetIndex]) {
      searchIndex++;
    }
    targetIndex++;
  }

  return searchIndex === searchLower.length;
}

/**
 * Get fuzzy match score (higher is better match)
 */
export function fuzzyScore(search: string, target: string): number {
  if (!fuzzyMatch(search, target)) return 0;

  const searchLower = search.toLowerCase();
  const targetLower = target.toLowerCase();

  let score = 0;
  let searchIndex = 0;
  let lastMatchIndex = -1;

  for (let i = 0; i < targetLower.length && searchIndex < searchLower.length; i++) {
    if (targetLower[i] === searchLower[searchIndex]) {
      if (lastMatchIndex === i - 1) {
        score += 10;
      }
      score += 5;
      lastMatchIndex = i;
      searchIndex++;
    }
  }

  return score;
}
