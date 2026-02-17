// main/shared/src/primitives/helpers/parse.ts
/**
 * Configuration Parsing Utilities
 *
 * Safe parsers for environment variables with fallback values.
 * Handle common edge cases: empty strings, whitespace, case variations.
 */

/** Parse an integer from an environment variable with a safety fallback. */
export const getInt = (val: string | undefined, fallback: number): number => {
  const parsed = parseInt(val ?? '', 10);
  return isNaN(parsed) ? fallback : parsed;
};

/** Parse a boolean from an environment variable (case-insensitive 'true'). */
export const getBool = (val: string | undefined): boolean => val?.toLowerCase().trim() === 'true';

/** Parse a comma-separated list from an environment variable. */
export const getList = (val: string | undefined): string[] =>
  val !== undefined && val !== ''
    ? val
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
    : [];

/** Get a required environment variable, throwing if missing. */
export const getRequired = (val: string | undefined, key: string): string => {
  if (val === undefined || val === '') {
    throw new Error(`Configuration Error: Missing required environment variable [${key}]`);
  }
  return val;
};
