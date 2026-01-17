// packages/core/src/contracts/users.ts
import { initContract } from '@ts-rest/core';
import { z } from 'zod';

import { errorResponseSchema, userSchema } from './common';

export const userResponseSchema = userSchema.extend({
  createdAt: z.string().datetime(),
});

export type UserResponse = z.infer<typeof userResponseSchema>;

const c = initContract();

export const usersContract = c.router({
  me: {
    method: 'GET',
    path: '/api/users/me',
    responses: {
      200: userResponseSchema,
      401: errorResponseSchema,
    },
    summary: 'Get current user profile',
  },
});
