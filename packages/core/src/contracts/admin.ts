// packages/core/src/contracts/admin.ts
/**
 * Admin Contract
 *
 * Admin-related schemas and API contract definitions.
 */

import { initContract } from '@ts-rest/core';
import { z } from 'zod';

import { emailSchema, errorResponseSchema } from './common';

// ============================================================================
// Request/Response Schemas
// ============================================================================

export const unlockAccountRequestSchema = z.object({
  email: emailSchema,
});

export const unlockAccountResponseSchema = z.object({
  message: z.string(),
  email: emailSchema,
});

export type UnlockAccountRequest = z.infer<typeof unlockAccountRequestSchema>;
export type UnlockAccountResponse = z.infer<typeof unlockAccountResponseSchema>;

// ============================================================================
// Admin Contract
// ============================================================================

const c = initContract();

export const adminContract = c.router({
  unlockAccount: {
    method: 'POST',
    path: '/api/admin/auth/unlock',
    body: unlockAccountRequestSchema,
    responses: {
      200: unlockAccountResponseSchema,
      401: errorResponseSchema,
      403: errorResponseSchema,
      404: errorResponseSchema,
    },
    summary: 'Unlock a locked user account (admin only)',
  },
});
