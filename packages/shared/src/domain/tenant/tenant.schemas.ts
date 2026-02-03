// shared/src/domain/tenant/tenant.schemas.ts

/**
 * @file Tenant Contracts
 * @description Types and schemas for Workspace/Tenant management.
 * @module Domain/Tenant
 */

import { z } from 'zod';

import { isoDateTimeSchema } from '../../core/schemas';
import { tenantIdSchema, userIdSchema } from '../../types/ids';

// ============================================================================
// Schemas
// ============================================================================

export const tenantSchema = z.object({
  id: tenantIdSchema,
  name: z.string().min(1).max(100),
  slug: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[a-z0-9-]+$/),
  logoUrl: z.string().url().nullable().optional(),
  ownerId: userIdSchema,
  isActive: z.boolean().default(true),
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
  metadata: z.record(z.unknown()).default({}),
});
export type Tenant = z.infer<typeof tenantSchema>;

// ============================================================================
// Input Schemas
// ============================================================================

export const createTenantSchema = z.object({
  name: z.string().min(1).max(100),
  slug: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[a-z0-9-]+$/)
    .optional(), // Optional, can be auto-generated
  metadata: z.record(z.unknown()).optional(),
});
export type CreateTenantInput = z.infer<typeof createTenantSchema>;

export const updateTenantSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  logoUrl: z.string().url().nullable().optional(),
  metadata: z.record(z.unknown()).optional(),
});
export type UpdateTenantInput = z.infer<typeof updateTenantSchema>;
