export interface FuzzyMatchResult {
  match?: string;
  skip?: string;
}

/**
 * Performs fuzzy matching between a pattern and text
 * @param pattern The pattern to match against
 * @param text The text to match
 * @returns Array of match results
 */
export function fuzzyMatch(
  pattern: string,
  text: string,
): Array<{ match?: string; skip?: string }> {
  if (!pattern) return [{ skip: text }];
  if (!text) return [];

  // Try to find the best match starting at each position
  let bestScore = 0;
  let bestResults: Array<{ match?: string; skip?: string }> = [];

  for (let startIndex = 0; startIndex < text.length; startIndex++) {
    const results: Array<{ match?: string; skip?: string }> = [];
    let currentMatch = "";
    let currentSkip = "";
    let patternIndex = 0;
    let textIndex = startIndex;

    while (textIndex < text.length && patternIndex < pattern.length) {
      if (
        pattern[patternIndex].toLowerCase() === text[textIndex].toLowerCase()
      ) {
        // Found a match
        if (currentSkip) {
          results.push({ skip: currentSkip });
          currentSkip = "";
        }
        currentMatch += text[textIndex];
        patternIndex++;
      } else {
        // No match
        if (currentMatch) {
          results.push({ match: currentMatch });
          currentMatch = "";
        }
        currentSkip += text[textIndex];
      }
      textIndex++;
    }

    // Handle any remaining match or skip
    if (currentMatch) {
      results.push({ match: currentMatch });
    }
    if (currentSkip) {
      results.push({ skip: currentSkip });
    }

    // Add any remaining text as a skip
    if (textIndex < text.length) {
      results.push({ skip: text.slice(textIndex) });
    }

    // Calculate score for this match
    const score = fuzzyMatchScore(results);
    if (score > bestScore) {
      bestScore = score;
      bestResults = results;
    }
  }

  // If we found no matches, return the entire text as a skip
  if (bestScore === 0) {
    return [{ skip: text }];
  }

  // Merge consecutive matches and skips
  const mergedResults: Array<{ match?: string; skip?: string }> = [];
  let lastType: "match" | "skip" | undefined;

  for (const result of bestResults) {
    if (result.match) {
      if (lastType === "match") {
        // Merge with previous match
        const lastResult = mergedResults[mergedResults.length - 1];
        lastResult.match += result.match;
      } else {
        mergedResults.push({ match: result.match });
        lastType = "match";
      }
    } else if (result.skip) {
      if (lastType === "skip") {
        // Merge with previous skip
        const lastResult = mergedResults[mergedResults.length - 1];
        lastResult.skip += result.skip;
      } else {
        mergedResults.push({ skip: result.skip });
        lastType = "skip";
      }
    }
  }

  return mergedResults;
}

/**
 * Calculates a score for fuzzy matching results
 * @param match Array of match results
 * @returns Score between 0 and 1
 */
export function fuzzyMatchScore(match: FuzzyMatchResult[] | undefined): number {
  if (!match || match.length === 0) return 0;

  let matched = 0;
  let total = 0;

  for (const item of match) {
    if (item.match) {
      matched += item.match.length;
    }
    total += (item.match?.length || 0) + (item.skip?.length || 0);
  }

  return total > 0 ? matched / total : 0;
}

/**
 * Calculates a weighted score for fuzzy matching results
 * @param match Array of match results
 * @returns Score between 0 and 1
 */
export function fuzzyMatchScore2(
  match: FuzzyMatchResult[] | undefined,
): number {
  if (!match || match.length === 0) return 0;

  let score = 0;
  let position = 0;
  let total = 0;

  for (const item of match) {
    if (item.match) {
      // Weight matches based on position, earlier matches are worth more
      const weight = (match.length - position) / match.length;
      score += item.match.length * weight;
      total += item.match.length;
    }
    if (item.skip) {
      total += item.skip.length;
    }
    position++;
  }

  return total > 0 ? score / total : 0;
}
