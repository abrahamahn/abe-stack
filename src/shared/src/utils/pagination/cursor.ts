// src/shared/src/utils/pagination/cursor.ts
import type { SortOrder } from '../constants';

/**
 * Cursor data structure for encoding pagination state
 */
export interface CursorData {
  /** Primary sort field value */
  value: string | number | Date;
  /** Tie-breaker field value (usually ID) */
  tieBreaker: string;
  /** Sort direction */
  sortOrder: SortOrder;
  /** Optional additional sort fields */
  additionalValues?: Array<string | number | Date> | undefined;
}

type CursorValue = CursorData['value'];
type EncodedCursorValue = string | number | { dateIso: string };

export function isCursorValue(value: unknown): value is CursorValue {
  return typeof value === 'string' || typeof value === 'number' || value instanceof Date;
}

function encodeCursorValue(value: CursorValue): EncodedCursorValue {
  return value instanceof Date ? { dateIso: value.toISOString() } : value;
}

function decodeCursorValue(value: unknown): CursorValue | null {
  if (typeof value === 'string' || typeof value === 'number') return value;
  if (value instanceof Date) return value;
  if (value !== null && value !== undefined && typeof value === 'object' && 'dateIso' in value) {
    const dateValue = (value as { dateIso?: unknown }).dateIso;
    if (typeof dateValue === 'string') {
      const parsed = new Date(dateValue);
      if (!Number.isNaN(parsed.getTime())) return parsed;
    }
  }
  return null;
}

function isSortOrder(value: unknown): value is SortOrder {
  return value === 'asc' || value === 'desc';
}

/**
 * Decode and validate an optional additionalValues array.
 * Returns undefined if rawValues is undefined, null if invalid,
 * or the decoded array on success.
 *
 * @param rawValues - The raw additionalValues from the parsed cursor
 * @returns Decoded values, undefined (absent), or null (invalid)
 * @complexity O(n) where n is the number of additional values
 */
function decodeAdditionalValues(
  rawValues: unknown,
): Array<string | number | Date> | undefined | null {
  if (rawValues === undefined) return undefined;
  if (!Array.isArray(rawValues)) return null;
  const decoded: Array<string | number | Date> = [];
  for (const entry of rawValues) {
    const value = decodeCursorValue(entry);
    if (value === null) return null;
    decoded.push(value);
  }
  return decoded;
}

function parseCursorData(parsed: unknown): CursorData | null {
  if (Array.isArray(parsed)) {
    const value = decodeCursorValue(parsed[0]);
    const tieBreaker: unknown = parsed[1];
    const sortOrder: unknown = parsed[2];
    if (value === null) return null;
    if (typeof tieBreaker !== 'string' || tieBreaker.trim() === '') return null;
    if (!isSortOrder(sortOrder)) return null;
    const extraValues = decodeAdditionalValues(parsed[3]);
    if (extraValues === null) return null;
    return { value, tieBreaker, sortOrder, additionalValues: extraValues };
  }

  if (parsed === null || parsed === undefined || typeof parsed !== 'object') return null;
  const record = parsed as Record<string, unknown>;
  const value = decodeCursorValue(record['value']);
  if (value === null) return null;
  const tieBreaker = record['tieBreaker'];
  if (typeof tieBreaker !== 'string' || tieBreaker.trim() === '') return null;
  const sortOrder = record['sortOrder'];
  if (!isSortOrder(sortOrder)) return null;
  const extraValues = decodeAdditionalValues(record['additionalValues']);
  if (extraValues === null) return null;
  return { value, tieBreaker, sortOrder, additionalValues: extraValues };
}

/**
 * Encodes cursor data into a base64-encoded JSON string
 * Uses URL-safe base64 encoding for web compatibility
 *
 * Performance optimization: Uses a compact JSON representation
 */
export function encodeCursor(data: CursorData): string {
  // Use a more compact representation for better performance
  const compactData =
    data.additionalValues !== undefined
      ? [
          encodeCursorValue(data.value),
          data.tieBreaker,
          data.sortOrder,
          data.additionalValues.map((value) => encodeCursorValue(value)),
        ]
      : [encodeCursorValue(data.value), data.tieBreaker, data.sortOrder];

  const jsonString = JSON.stringify(compactData);
  return Buffer.from(jsonString, 'utf8').toString('base64url');
}

/**
 * Decodes a cursor string back into CursorData
 * Returns null if the cursor is invalid
 */
export function decodeCursor(cursor: string): CursorData | null {
  if (cursor === '') {
    return null;
  }

  try {
    const jsonString = Buffer.from(cursor, 'base64url').toString('utf8');
    const parsed: unknown = JSON.parse(jsonString);
    return parseCursorData(parsed);
  } catch {
    return null;
  }
}

/**
 * Creates a cursor for the given item based on sort configuration
 */
export function createCursorForItem<T>(
  item: T,
  sortBy: string,
  sortOrder: SortOrder,
  tieBreakerField: keyof T = 'id' as keyof T,
): string {
  const value = (item as Record<string, unknown>)[sortBy];
  if (!isCursorValue(value)) {
    throw new Error(`Item missing or has invalid sort field: ${sortBy}`);
  }
  const tieBreakerKey = String(tieBreakerField);
  const tieBreakerValue = (item as Record<string, unknown>)[tieBreakerKey];

  if (
    tieBreakerValue === undefined ||
    tieBreakerValue === null ||
    (typeof tieBreakerValue !== 'string' && typeof tieBreakerValue !== 'number')
  ) {
    throw new Error(`Invalid tie-breaker field: ${tieBreakerKey}. Must be string or number.`);
  }
  const tieBreaker = String(tieBreakerValue);

  const cursorData: CursorData = {
    value,
    tieBreaker,
    sortOrder,
  };

  return encodeCursor(cursorData);
}

/**
 * Helper function to get sortable value from an item
 */
export function getSortableValue(item: unknown, key: string): CursorValue {
  const value = (item as Record<string, unknown>)[key];
  if (!isCursorValue(value)) {
    throw new Error(`Invalid sort value for key "${key}"`);
  }
  return value;
}
