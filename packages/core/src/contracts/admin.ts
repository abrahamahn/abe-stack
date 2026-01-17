// packages/core/src/contracts/admin.ts
import { initContract } from '@ts-rest/core';
import { z } from 'zod';

import { errorResponseSchema } from './common';

export const unlockAccountRequestSchema = z.object({
  email: z.string().email(),
});

export const unlockAccountResponseSchema = z.object({
  message: z.string(),
  email: z.string().email(),
});

export type UnlockAccountRequest = z.infer<typeof unlockAccountRequestSchema>;
export type UnlockAccountResponse = z.infer<typeof unlockAccountResponseSchema>;

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
