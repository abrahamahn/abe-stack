// core/src/infrastructure/transactions/index.ts
/**
 * Transaction Operations
 *
 * Types and utilities for creating and manipulating transactions
 * used in undo/redo functionality.
 */

// Operation creators and utilities
export {
  createListInsertOperation,
  createListRemoveOperation,
  createSetOperation,
  createTransaction,
  invertOperation,
  invertTransaction,
  mergeTransactions,
} from './operations';

// Types and type guards
export { isListInsertOperation, isListRemoveOperation, isSetOperation } from './types';
export type {
  ListInsertOperation,
  ListRemoveOperation,
  Operation,
  SetOperation,
  Transaction,
} from './types';
