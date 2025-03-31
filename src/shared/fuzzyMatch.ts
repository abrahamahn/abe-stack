interface MatchResult {
  match: string;
}

export function fuzzyMatch(query: string, text: string): MatchResult[] {
  if (!query || !text) {
    return [];
  }

  // If query matches text exactly, return it as a single match
  if (query === text) {
    return [{ match: text }];
  }

  // If query is a substring of text, return it as a single match
  const lowerQuery = query.toLowerCase();
  const lowerText = text.toLowerCase();
  const index = lowerText.indexOf(lowerQuery);
  if (index !== -1) {
    return [{ match: text.substring(index, index + query.length) }];
  }

  // For fuzzy matching, we'll only return matches if all characters are found in sequence
  let queryIndex = 0;
  let textIndex = 0;
  const matches: string[] = [];
  let currentMatch = "";

  while (queryIndex < query.length && textIndex < text.length) {
    if (text[textIndex].toLowerCase() === query[queryIndex].toLowerCase()) {
      currentMatch += text[textIndex];
      queryIndex++;
      if (queryIndex === query.length) {
        matches.push(currentMatch);
        currentMatch = "";
      }
    }
    textIndex++;
  }

  return matches.length > 0 ? matches.map((match) => ({ match })) : [];
}
