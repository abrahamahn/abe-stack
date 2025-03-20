/**
 * Type guard utilities for safely handling database results
 */

/**
 * Type guard to check if a value is a non-null object
 */
export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/**
 * Safely cast a database row to a record type
 * This function provides runtime validation before the type assertion
 */
export function asRecord<T = unknown>(value: unknown): Record<string, T> {
  if (!isRecord(value)) {
    throw new Error("Expected database result to be an object");
  }
  return value as Record<string, T>;
}

/**
 * Safely access a property on an unknown object with runtime validation
 */
export function getProp<T>(obj: unknown, key: string): T {
  if (!isRecord(obj)) {
    throw new Error(`Expected an object, got ${typeof obj}`);
  }

  if (!(key in obj)) {
    throw new Error(`Property '${key}' not found in object`);
  }

  return obj[key] as T;
}

/**
 * Safely convert query result rows to a properly typed array
 */
export function mapQueryRows<T>(
  rows: unknown[],
  mapper: (row: Record<string, unknown>) => T,
): T[] {
  return rows.map((row) => {
    if (!isRecord(row)) {
      throw new Error("Database row is not an object");
    }
    return mapper(row);
  });
}
