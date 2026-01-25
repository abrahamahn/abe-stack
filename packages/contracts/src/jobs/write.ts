// packages/contracts/src/jobs/write.ts
/**
 * Write Service Contract
 *
 * Defines the simplified write interface for atomic operations.
 */

export interface WriteOperation<T = unknown> {
  type: 'create' | 'update' | 'delete';
  table: string;
  id: string;
  data?: Partial<T>;
  expectedVersion?: number;
}

export interface WriteResult<T = unknown> {
  txId: string;
  success: boolean;
  results: OperationResult<T>[];
  error?: WriteError;
}

export interface OperationResult<T = unknown> {
  operation: WriteOperation<T>;
  record?: T & { id: string; version: number };
  previousVersion?: number;
}

export interface WriteError {
  code: 'CONFLICT' | 'VALIDATION' | 'NOT_FOUND' | 'INTERNAL';
  message: string;
}

export interface WriteBatch {
  txId: string;
  authorId: string;
  operations: WriteOperation[];
}

export interface WriteService {
  write<T = unknown>(batch: WriteBatch): Promise<WriteResult<T>>;
  writeOne<T = unknown>(authorId: string, operation: WriteOperation<T>): Promise<WriteResult<T>>;
}
