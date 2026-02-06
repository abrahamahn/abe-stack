// packages/shared/src/config/env.parsers.ts
/**
 * Configuration Parsing Utilities
 *
 * Safe parsers for environment variables with fallback values.
 * Handle common edge cases: empty strings, whitespace, case variations.
 */

/**
 * Parse an integer from an environment variable with a safety fallback.
 *
 * Handles empty strings, undefined values, and non-numeric input gracefully.
 * Returns the fallback value for any invalid input rather than throwing.
 *
 * @param val - The string value to parse (typically from process.env)
 * @param fallback - Default value if parsing fails
 * @returns Parsed integer or fallback value
 *
 * @example
 * ```typescript
 * getInt(process.env.PORT, 3000);        // '8080' → 8080
 * getInt(process.env.PORT, 3000);        // undefined → 3000
 * getInt(process.env.PORT, 3000);        // 'abc' → 3000
 * ```
 */
export const getInt = (val: string | undefined, fallback: number): number => {
  const parsed = parseInt(val ?? '', 10);
  return isNaN(parsed) ? fallback : parsed;
};

/**
 * Parse a boolean from an environment variable.
 *
 * Case-insensitive: accepts 'true', 'True', 'TRUE', etc.
 * Any other value (including undefined) returns false.
 *
 * @param val - The string value to parse (typically from process.env)
 * @returns true if value is 'true' (case-insensitive), false otherwise
 *
 * @example
 * ```typescript
 * getBool(process.env.ENABLED);   // 'true' → true
 * getBool(process.env.ENABLED);   // 'TRUE' → true
 * getBool(process.env.ENABLED);   // 'false' → false
 * getBool(process.env.ENABLED);   // undefined → false
 * getBool(process.env.ENABLED);   // '' → false
 * ```
 */
export const getBool = (val: string | undefined): boolean => val?.toLowerCase().trim() === 'true';

/**
 * Parse a comma-separated list from an environment variable.
 *
 * Splits on commas, trims whitespace from each item, and filters empty strings.
 * Returns an empty array for undefined or empty input.
 *
 * @param val - The string value to parse (typically from process.env)
 * @returns Array of trimmed, non-empty strings
 *
 * @example
 * ```typescript
 * getList(process.env.ORIGINS);   // 'a, b, c' → ['a', 'b', 'c']
 * getList(process.env.ORIGINS);   // 'a,,c' → ['a', 'c']
 * getList(process.env.ORIGINS);   // undefined → []
 * getList(process.env.ORIGINS);   // '' → []
 * ```
 */
export const getList = (val: string | undefined): string[] =>
  val !== undefined && val !== ''
    ? val
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
    : [];

/**
 * Get a required environment variable, throwing if missing.
 *
 * Use for critical configuration values (JWT secrets, API keys) that
 * must be present for the application to function. Fails fast at startup
 * with a clear error message rather than failing later with undefined.
 *
 * @param val - The string value to validate (typically from process.env)
 * @param key - The environment variable name (for error messages)
 * @returns The validated string value
 * @throws Error if value is undefined or empty
 *
 * @example
 * ```typescript
 * const jwtSecret = getRequired(process.env.JWT_SECRET, 'JWT_SECRET');
 * ```
 */
export const getRequired = (val: string | undefined, key: string): string => {
  if (val === undefined || val === '') {
    throw new Error(`Configuration Error: Missing required environment variable [${key}]`);
  }
  return val;
};
