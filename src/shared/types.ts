// Define the Validator interface
export interface Validator<T> {
  validate(value: unknown): T;
}

export interface FuzzyMatchResult {
  match: string;
  skip?: string;
}

export interface FuzzyMatch {
  matches: FuzzyMatchResult[];
  score: number;
}

export interface FuzzyMatchOptions {
  threshold?: number;
  ignoreCase?: boolean;
  ignoreDiacritics?: boolean;
}
