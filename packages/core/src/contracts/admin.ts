// packages/core/src/contracts/admin.ts
/**
 * Admin Contract
 *
 * Admin-related schemas and API contract definitions.
 */

import { z } from 'zod';

import { emailSchema, errorResponseSchema } from './common';

import type { Contract } from './types';


// ============================================================================
// Request/Response Schemas
// ============================================================================

export const unlockAccountRequestSchema = z.object({
  email: emailSchema,
  reason: z.string().min(1).max(500),
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

export const adminContract = {
  unlockAccount: {
    method: 'POST' as const,
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
} satisfies Contract;
