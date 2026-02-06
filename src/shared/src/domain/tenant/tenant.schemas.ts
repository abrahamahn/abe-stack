// packages/shared/src/domain/tenant/tenant.schemas.ts

/**
 * @file Tenant Contracts
 * @description Types and schemas for Workspace/Tenant management.
 * @module Domain/Tenant
 */

import { isoDateTimeSchema } from '../../contracts/common';
import {
  createSchema,
  parseBoolean,
  parseNullableOptional,
  parseOptional,
  parseRecord,
  parseString,
  withDefault,
} from '../../contracts/schema';
import { tenantIdSchema, userIdSchema } from '../../types/ids';

import type { Schema } from '../../contracts/types';
import type { TenantId, UserId } from '../../types/ids';

// ============================================================================
// Types
// ============================================================================

/** Slug format regex: lowercase alphanumeric and hyphens */
const SLUG_REGEX = /^[a-z0-9-]+$/;

/** Full tenant entity */
export interface Tenant {
  id: TenantId;
  name: string;
  slug: string;
  logoUrl?: string | null | undefined;
  ownerId: UserId;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  metadata: Record<string, unknown>;
}

/** Input for creating a new tenant */
export interface CreateTenantInput {
  name: string;
  slug?: string | undefined;
  metadata?: Record<string, unknown> | undefined;
}

/** Input for updating an existing tenant */
export interface UpdateTenantInput {
  name?: string | undefined;
  logoUrl?: string | null | undefined;
  metadata?: Record<string, unknown> | undefined;
}

// ============================================================================
// Schemas
// ============================================================================

export const tenantSchema: Schema<Tenant> = createSchema((data: unknown) => {
  const obj = (data !== null && typeof data === 'object' ? data : {}) as Record<string, unknown>;

  return {
    id: tenantIdSchema.parse(obj['id']),
    name: parseString(obj['name'], 'name', { min: 1, max: 100 }),
    slug: parseString(obj['slug'], 'slug', {
      min: 1,
      max: 100,
      regex: SLUG_REGEX,
      regexMessage: 'slug must contain only lowercase letters, numbers, and hyphens',
    }),
    logoUrl: parseNullableOptional(obj['logoUrl'], (v) => parseString(v, 'logoUrl', { url: true })),
    ownerId: userIdSchema.parse(obj['ownerId']),
    isActive: parseBoolean(withDefault(obj['isActive'], true), 'isActive'),
    createdAt: isoDateTimeSchema.parse(obj['createdAt']),
    updatedAt: isoDateTimeSchema.parse(obj['updatedAt']),
    metadata:
      withDefault(obj['metadata'], {}) !== undefined
        ? parseRecord(withDefault(obj['metadata'], {}), 'metadata')
        : {},
  };
});

// ============================================================================
// Input Schemas
// ============================================================================

export const createTenantSchema: Schema<CreateTenantInput> = createSchema((data: unknown) => {
  const obj = (data !== null && typeof data === 'object' ? data : {}) as Record<string, unknown>;

  return {
    name: parseString(obj['name'], 'name', { min: 1, max: 100 }),
    slug: parseOptional(obj['slug'], (v) =>
      parseString(v, 'slug', {
        min: 1,
        max: 100,
        regex: SLUG_REGEX,
        regexMessage: 'slug must contain only lowercase letters, numbers, and hyphens',
      }),
    ),
    metadata: parseOptional(obj['metadata'], (v) => parseRecord(v, 'metadata')),
  };
});

export const updateTenantSchema: Schema<UpdateTenantInput> = createSchema((data: unknown) => {
  const obj = (data !== null && typeof data === 'object' ? data : {}) as Record<string, unknown>;

  return {
    name: parseOptional(obj['name'], (v) => parseString(v, 'name', { min: 1, max: 100 })),
    logoUrl: parseNullableOptional(obj['logoUrl'], (v) => parseString(v, 'logoUrl', { url: true })),
    metadata: parseOptional(obj['metadata'], (v) => parseRecord(v, 'metadata')),
  };
});
