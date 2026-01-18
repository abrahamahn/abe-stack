// packages/core/src/contracts/common.ts
import { z } from 'zod';

// User roles - kept in sync with apps/server/src/infra/database/schema/users.ts
export const USER_ROLES = ['user', 'admin', 'moderator'] as const;
export const userRoleSchema = z.enum(USER_ROLES);
export type UserRole = z.infer<typeof userRoleSchema>;

// Shared schemas
export const errorResponseSchema = z.object({
  error: z.string(),
  message: z.string(),
  code: z.string().optional(),
  details: z.record(z.unknown()).optional(),
});
export type ErrorResponse = z.infer<typeof errorResponseSchema>;

export const userSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string().nullable(),
  role: userRoleSchema,
});
