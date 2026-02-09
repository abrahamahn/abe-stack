// src/shared/src/core/transactions/types.ts

/**
 * Set operation - replaces a value at a path.
 */
export type SetOperation = {
  type: 'set';
  /** Path to the value, e.g., ['users', 'user-1', 'name'] */
  path: string[];
  /** New value to set */
  value: unknown;
  /** Previous value (for inversion) */
  previousValue?: unknown;
};

/**
 * List insert operation - adds an item to a list.
 */
export type ListInsertOperation = {
  type: 'listInsert';
  /** Path to the list */
  path: string[];
  /** Value to insert */
  value: unknown;
  /** Position specification */
  position: 'prepend' | 'append' | { after: unknown };
};

/**
 * List remove operation - removes an item from a list.
 */
export type ListRemoveOperation = {
  type: 'listRemove';
  /** Path to the list */
  path: string[];
  /** Value to remove */
  value: unknown;
  /** Original position index (for inversion) */
  previousPosition?: number | undefined;
};

/**
 * Union of all operation types.
 */
export type Operation = SetOperation | ListInsertOperation | ListRemoveOperation;

/**
 * A transaction is a group of operations that can be undone/redone together.
 */
export type Transaction = {
  /** Unique identifier */
  id: string;
  /** Timestamp when the transaction was created */
  timestamp: number;
  /** Operations in this transaction */
  operations: Operation[];
};

/**
 * Type guard for SetOperation.
 */
export function isSetOperation(op: Operation): op is SetOperation {
  return op.type === 'set';
}

/**
 * Type guard for ListInsertOperation.
 */
export function isListInsertOperation(op: Operation): op is ListInsertOperation {
  return op.type === 'listInsert';
}

/**
 * Type guard for ListRemoveOperation.
 */
export function isListRemoveOperation(op: Operation): op is ListRemoveOperation {
  return op.type === 'listRemove';
}
