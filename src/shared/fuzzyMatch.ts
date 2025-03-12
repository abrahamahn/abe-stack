export interface MatchItem {
	text: string;
	matched: boolean;
}

export type FuzzyMatch = MatchItem[];

export function fuzzyMatch(query: string, text: string): FuzzyMatch | null {
	if (!query) return null;

	const result: MatchItem[] = [];
	let currentIndex = 0;
	let queryIndex = 0;

	while (currentIndex < text.length && queryIndex < query.length) {
		const queryChar = query[queryIndex].toLowerCase();
		const textChar = text[currentIndex].toLowerCase();

		if (queryChar === textChar) {
			result.push({
				text: text[currentIndex],
				matched: true,
			});
			queryIndex++;
		} else {
			result.push({
				text: text[currentIndex],
				matched: false,
			});
		}
		currentIndex++;
	}

	// Add remaining text as unmatched
	while (currentIndex < text.length) {
		result.push({
			text: text[currentIndex],
			matched: false,
		});
		currentIndex++;
	}

	// If we haven't matched all query characters, return null
	if (queryIndex < query.length) {
		return null;
	}

	return result;
}

export function fuzzyMatchScore(query: string, text: string): number {
	const match = fuzzyMatch(query, text);
	if (!match) return 0;

	const matchedChars = match.filter(item => item.matched).length;
	const consecutiveMatches = match.reduce((count, item, i) => {
		if (item.matched && i > 0 && match[i - 1].matched) {
			return count + 1;
		}
		return count;
	}, 0);

	return matchedChars + consecutiveMatches;
}
