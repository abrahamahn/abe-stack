// main/shared/src/contracts/contract.realtime.ts

import { errorResponseSchema } from '../system/http/response';
import {
  conflictResponseSchema,
  getRecordsRequestSchema,
  getRecordsResponseSchema,
  transactionSchema,
  writeResponseSchema,
} from '../system/realtime/realtime';

import type { Contract } from '../primitives/api';

/** Realtime API contract definition */
export const realtimeContract = {
  write: {
    method: 'POST' as const,
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
  getRecords: {
    method: 'POST' as const,
    path: '/api/realtime/getRecords',
    body: getRecordsRequestSchema,
    responses: {
      200: getRecordsResponseSchema,
      400: errorResponseSchema,
      403: errorResponseSchema,
      500: errorResponseSchema,
    },
    summary: 'Fetch records by table and ID',
  },
} satisfies Contract;
