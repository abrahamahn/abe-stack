// packages/core/src/contracts/realtime.ts
/**
 * Realtime Contract
 *
 * API contract definitions for real-time record operations.
 * Supports optimistic locking with version-based conflict detection.
 */

import { initContract } from '@ts-rest/core';
import { z } from 'zod';

import { errorResponseSchema } from './common';

// ============================================================================
// Operation Schemas
// ============================================================================

/**
 * Set a field value on a record
 */
export const setOperationSchema = z.object({
  type: z.literal('set'),
  table: z.string().min(1),
  id: z.uuid(),
  key: z.string().min(1),
  value: z.unknown(),
});

/**
 * Set a field to current timestamp (server-side)
 */
export const setNowOperationSchema = z.object({
  type: z.literal('set-now'),
  table: z.string().min(1),
  id: z.uuid(),
  key: z.string().min(1),
});

/**
 * Position specification for list insert operations
 */
export const listPositionSchema = z.union([
  z.literal('prepend'),
  z.literal('append'),
  z.object({ before: z.unknown() }),
  z.object({ after: z.unknown() }),
]);

/**
 * Insert a value into a list field
 */
export const listInsertOperationSchema = z.object({
  type: z.literal('listInsert'),
  table: z.string().min(1),
  id: z.uuid(),
  key: z.string().min(1),
  value: z.unknown(),
  position: listPositionSchema,
});

/**
 * Remove a value from a list field
 */
export const listRemoveOperationSchema = z.object({
  type: z.literal('listRemove'),
  table: z.string().min(1),
  id: z.uuid(),
  key: z.string().min(1),
  value: z.unknown(),
});

/**
 * Union of all operation types
 */
export const operationSchema = z.discriminatedUnion('type', [
  setOperationSchema,
  setNowOperationSchema,
  listInsertOperationSchema,
  listRemoveOperationSchema,
]);

// ============================================================================
// Transaction Schema
// ============================================================================

/**
 * A transaction containing multiple operations to apply atomically
 */
export const transactionSchema = z.object({
  /** Unique transaction ID (for idempotency and tracking) */
  txId: z.uuid(),
  /** User ID performing the transaction */
  authorId: z.uuid(),
  /** Operations to apply */
  operations: z.array(operationSchema).min(1),
  /** Client-side timestamp (for ordering) */
  clientTimestamp: z.number().int().positive(),
});

// ============================================================================
// Record Pointer Schema
// ============================================================================

/**
 * Points to a specific record by table and ID
 */
export const recordPointerSchema = z.object({
  table: z.string().min(1),
  id: z.uuid(),
});

// ============================================================================
// Response Schemas
// ============================================================================

/**
 * A record with required id and version fields
 */
export const recordSchema = z
  .object({
    id: z.uuid(),
    version: z.number().int().positive(),
  })
  .catchall(z.unknown());

/**
 * Map of table -> id -> record
 */
export const recordMapSchema = z.record(z.string(), z.record(z.string(), recordSchema));

/**
 * Success response with updated records
 */
export const writeResponseSchema = z.object({
  recordMap: recordMapSchema,
});

/**
 * Conflict response (409)
 */
export const conflictResponseSchema = z.object({
  message: z.string(),
  conflictingRecords: z.array(recordPointerSchema).optional(),
});

/**
 * Get records response
 */
export const getRecordsResponseSchema = z.object({
  recordMap: recordMapSchema,
});

// ============================================================================
// Type Exports
// ============================================================================

export type SetOperation = z.infer<typeof setOperationSchema>;
export type SetNowOperation = z.infer<typeof setNowOperationSchema>;
export type ListInsertOperation = z.infer<typeof listInsertOperationSchema>;
export type ListRemoveOperation = z.infer<typeof listRemoveOperationSchema>;
export type ListPosition = z.infer<typeof listPositionSchema>;
export type Operation = z.infer<typeof operationSchema>;
export type Transaction = z.infer<typeof transactionSchema>;
export type RecordPointer = z.infer<typeof recordPointerSchema>;
export type RealtimeRecord = z.infer<typeof recordSchema>;
export type RecordMap = z.infer<typeof recordMapSchema>;
export type WriteResponse = z.infer<typeof writeResponseSchema>;
export type ConflictResponse = z.infer<typeof conflictResponseSchema>;
export type GetRecordsResponse = z.infer<typeof getRecordsResponseSchema>;

// ============================================================================
// Realtime Contract
// ============================================================================

const c = initContract();

export const realtimeContract = c.router({
  /**
   * Write a transaction of operations
   *
   * Applies multiple operations atomically with optimistic locking.
   * Returns 409 if any record has been modified since it was loaded.
   */
  write: {
    method: 'POST',
    path: '/api/realtime/write',
    body: transactionSchema,
    responses: {
      200: writeResponseSchema,
      400: errorResponseSchema,
      403: errorResponseSchema,
      409: conflictResponseSchema,
      500: errorResponseSchema,
    },
    summary: 'Apply a transaction of operations with optimistic locking',
  },

  /**
   * Get records by pointers
   *
   * Fetches multiple records by their table and ID.
   * Returns a RecordMap with all found records.
   */
  getRecords: {
    method: 'POST',
    path: '/api/realtime/getRecords',
    body: z.object({
      pointers: z.array(recordPointerSchema).min(1).max(100),
    }),
    responses: {
      200: getRecordsResponseSchema,
      400: errorResponseSchema,
      403: errorResponseSchema,
      500: errorResponseSchema,
    },
    summary: 'Fetch records by table and ID',
  },
});
