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
  const results: Array<{ match?: string; skip?: string }> = [];
  let currentMatch = "";
  let currentSkip = "";
  let patternIndex = 0;
  let textIndex = 0;

  while (textIndex < text.length && patternIndex < pattern.length) {
    const patternChar = pattern[patternIndex].toLowerCase();
    const textChar = text[textIndex].toLowerCase();

    if (patternChar === textChar) {
      if (currentSkip) {
        results.push({ skip: currentSkip });
        currentSkip = "";
      }
      currentMatch += text[textIndex];
      patternIndex++;
      textIndex++;
    } else {
      if (currentMatch) {
        results.push({ match: currentMatch });
        currentMatch = "";
      }
      currentSkip += text[textIndex];
      textIndex++;

      // Check if we need to backtrack
      if (textIndex === text.length && patternIndex < pattern.length) {
        // Try to find a better match by backtracking
        let backtrackIndex = textIndex - 1;
        while (backtrackIndex >= 0) {
          if (text[backtrackIndex].toLowerCase() === patternChar) {
            // Found a better match, update results
            if (currentSkip) {
              results.push({
                skip: currentSkip.slice(0, backtrackIndex - textIndex + 1),
              });
              currentSkip = currentSkip.slice(backtrackIndex - textIndex + 1);
            }
            currentMatch = text[backtrackIndex];
            patternIndex++;
            textIndex = backtrackIndex + 1;
            break;
          }
          backtrackIndex--;
        }
      }
    }
  }

  // Add any remaining match or skip
  if (currentMatch) {
    results.push({ match: currentMatch });
  }
  if (currentSkip) {
    results.push({ skip: currentSkip });
  }

  // Add any remaining text as skip
  if (textIndex < text.length) {
    results.push({ skip: text.slice(textIndex) });
  }

  // Merge consecutive matches and skips
  const mergedResults: Array<{ match?: string; skip?: string }> = [];
  let currentResult = results[0];

  for (let i = 1; i < results.length; i++) {
    const result = results[i];
    if (result.match && currentResult.match) {
      currentResult.match += result.match;
    } else if (result.skip && currentResult.skip) {
      currentResult.skip += result.skip;
    } else {
      mergedResults.push(currentResult);
      currentResult = result;
    }
  }
  mergedResults.push(currentResult);

  return mergedResults;
}

// TODO: These scoring functions are pretty arbitrary currently...

/**
 * matchedChars^2 / textLength
 * This is ok, but really discounts matching long text.
 */
export function fuzzyMatchScore(match: FuzzyMatchResult[] | undefined): number {
  if (!match) return 0;

  let matched = 0;
  let unmatched = 0;

  for (const item of match) {
    if (item.match) {
      matched += 1;
    } else {
      unmatched += 1;
    }
  }

  const normalizedScore = matched ** 2 / (matched + unmatched);

  return normalizedScore;
}

/**
 * sum(matchedChars^2 / distanceFromStart^(1/2))^(1/2)
 * Weighted on bigger matches closer to the beginning of the string.
 */
export function fuzzyMatchScore2(
  match: FuzzyMatchResult[] | undefined,
): number {
  // This scoring is kind of an arbitrary idea.
  // Quatratic sum of the size of the length of the matches.
  // Discounted by how far from the beginning the match is.

  if (!match) return 0;

  let score = 0;

  for (let i = 0; i < match.length; i++) {
    const item = match[i];
    if (item.match) {
      score += 1 / Math.sqrt(i + 1);
    }
  }

  return Math.sqrt(score);
}
