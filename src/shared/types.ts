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
