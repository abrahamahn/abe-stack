// core/src/infrastructure/transactions/operations.ts
import type {
  Operation,
  SetOperation,
  ListInsertOperation,
  ListRemoveOperation,
  Transaction,
} from './types';

/**
 * Invert a set operation.
 * Swaps value and previousValue.
 */
function invertSetOperation(op: SetOperation): SetOperation {
  return {
    type: 'set',
    path: op.path,
    value: op.previousValue,
    previousValue: op.value,
  };
}

/**
 * Invert a list insert operation.
 * Becomes a list remove operation.
 */
function invertListInsertOperation(op: ListInsertOperation): ListRemoveOperation {
  return {
    type: 'listRemove',
    path: op.path,
    value: op.value,
    // Note: previousPosition is not set here because we don't know the exact index
    // The applying code needs to find the value in the list
  };
}

/**
 * Invert a list remove operation.
 * Becomes a list insert operation.
 */
function invertListRemoveOperation(op: ListRemoveOperation): ListInsertOperation {
  // Determine position for reinsertion
  let position: ListInsertOperation['position'];

  if (op.previousPosition === undefined) {
    // If we don't know the original position, append
    position = 'append';
  } else if (op.previousPosition === 0) {
    position = 'prepend';
  } else {
    // Insert after the item at previousPosition - 1
    // Note: This requires knowing the value at that position
    // For simplicity, we store the index as the "after" value
    position = { after: op.previousPosition - 1 };
  }

  return {
    type: 'listInsert',
    path: op.path,
    value: op.value,
    position,
  };
}

/**
 * Invert an operation to create its reverse.
 * Used for undo functionality.
 *
 * @example
 * ```typescript
 * const setOp: SetOperation = {
 *   type: 'set',
 *   path: ['user', 'name'],
 *   value: 'New Name',
 *   previousValue: 'Old Name',
 * };
 * const inverse = invertOperation(setOp);
 * // inverse.value === 'Old Name'
 * // inverse.previousValue === 'New Name'
 * ```
 */
export function invertOperation(op: Operation): Operation {
  switch (op.type) {
    case 'set':
      return invertSetOperation(op);
    case 'listInsert':
      return invertListInsertOperation(op);
    case 'listRemove':
      return invertListRemoveOperation(op);
  }
}

/**
 * Invert a transaction.
 * Creates a new transaction with all operations inverted and reversed.
 * The reversal ensures operations are applied in the correct order for undo.
 *
 * @example
 * ```typescript
 * const tx = {
 *   id: 'tx-1',
 *   timestamp: Date.now(),
 *   operations: [
 *     { type: 'set', path: ['a'], value: 1, previousValue: 0 },
 *     { type: 'set', path: ['b'], value: 2, previousValue: 0 },
 *   ],
 * };
 * const inverse = invertTransaction(tx);
 * // Operations are reversed: b then a
 * // Each operation is inverted
 * ```
 */
export function invertTransaction(tx: Transaction): Transaction {
  return {
    id: crypto.randomUUID(),
    timestamp: Date.now(),
    operations: tx.operations.map(invertOperation).reverse(),
  };
}

/**
 * Merge two transactions into one.
 * Useful for batching rapid edits.
 */
export function mergeTransactions(tx1: Transaction, tx2: Transaction): Transaction {
  return {
    id: tx2.id, // Use the newer transaction's ID
    timestamp: tx2.timestamp, // Use the newer timestamp
    operations: [...tx1.operations, ...tx2.operations],
  };
}

/**
 * Create a set operation with proper structure.
 */
export function createSetOperation(
  path: string[],
  value: unknown,
  previousValue?: unknown,
): SetOperation {
  return {
    type: 'set',
    path,
    value,
    previousValue,
  };
}

/**
 * Create a list insert operation.
 */
export function createListInsertOperation(
  path: string[],
  value: unknown,
  position: ListInsertOperation['position'] = 'append',
): ListInsertOperation {
  return {
    type: 'listInsert',
    path,
    value,
    position,
  };
}

/**
 * Create a list remove operation.
 */
export function createListRemoveOperation(
  path: string[],
  value: unknown,
  previousPosition?: number,
): ListRemoveOperation {
  const result: ListRemoveOperation = {
    type: 'listRemove',
    path,
    value,
  };
  if (previousPosition !== undefined) {
    result.previousPosition = previousPosition;
  }
  return result;
}

/**
 * Create a new transaction with the given operations.
 */
export function createTransaction(operations: Operation[]): Transaction {
  return {
    id: crypto.randomUUID(),
    timestamp: Date.now(),
    operations,
  };
}
