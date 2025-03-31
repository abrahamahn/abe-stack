// Define the Validator interface
export interface Validator<T> {
  validate(value: unknown): T;
}

// Renamed to avoid conflicts with utils/fuzzyMatch.ts
export interface FuzzyMatchResultType {
  match: string;
  skip?: string;
}

// Renamed to avoid conflicts with utils/fuzzyMatch.ts
export interface FuzzyMatchType {
  matches: FuzzyMatchResultType[];
  score: number;
}

export interface FuzzyMatchOptions {
  threshold?: number;
  ignoreCase?: boolean;
  ignoreDiacritics?: boolean;
}

export interface PaginationOptions {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
