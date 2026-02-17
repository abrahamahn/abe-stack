// main/shared/src/core/billing/billing.admin.schemas.ts

/**
 * @file Billing Admin Schemas
 * @description Admin-specific schemas for plan management and billing stats.
 * @module Core/Billing
 */

import {
  createEnumSchema,
  createSchema,
  parseBoolean,
  parseNullable,
  parseNumber,
  parseOptional,
  parseString,
  withDefault,
} from '../../primitives/schema';
import { isoDateTimeSchema } from '../auth/auth.scalars.schemas';
import { PLAN_INTERVALS } from '../constants/billing';
import { planFeatureSchema, planSchema } from './billing.schemas';

import type { Schema } from '../../primitives/schema';
import type { Plan, PlanFeature, PlanInterval } from './billing.schemas';

// ============================================================================
// Types
// ============================================================================

/** Admin plan entity (extends Plan with provider-specific fields) */
export interface AdminPlan extends Plan {
  stripePriceId: string | null;
  stripeProductId: string | null;
  paypalPlanId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AdminPlansListResponse {
  plans: AdminPlan[];
}

export interface CreatePlanRequest {
  name: string;
  description?: string | undefined;
  interval: PlanInterval;
  priceInCents: number;
  currency?: string | undefined;
  features: PlanFeature[];
  trialDays: number;
  isActive?: boolean | undefined;
  sortOrder?: number | undefined;
}

export interface UpdatePlanRequest {
  name?: string | undefined;
  description?: string | null | undefined;
  interval?: PlanInterval | undefined;
  priceInCents?: number | undefined;
  currency?: string | undefined;
  features?: PlanFeature[] | undefined;
  trialDays?: number | undefined;
  isActive?: boolean | undefined;
  sortOrder?: number | undefined;
}

export interface AdminPlanResponse {
  plan: AdminPlan;
}

export interface SyncStripeResponse {
  success: boolean;
  stripePriceId: string;
  stripeProductId: string;
}

export interface AdminBillingStats {
  totalRevenue: number;
  activeSubscriptions: number;
  churnRate: number;
  mrr: number;
}

// ============================================================================
// Schemas
// ============================================================================

/** Plan interval enum schema */
const planIntervalSchema = createEnumSchema(PLAN_INTERVALS, 'plan interval');

export const adminPlanSchema: Schema<AdminPlan> = createSchema((data: unknown) => {
  const basePlan = planSchema.parse(data);
  const obj = data as Record<string, unknown>;

  return {
    ...basePlan,
    stripePriceId: parseNullable(obj['stripePriceId'], (v) => parseString(v, 'stripePriceId')),
    stripeProductId: parseNullable(obj['stripeProductId'], (v) =>
      parseString(v, 'stripeProductId'),
    ),
    paypalPlanId: parseNullable(obj['paypalPlanId'], (v) => parseString(v, 'paypalPlanId')),
    createdAt: isoDateTimeSchema.parse(obj['createdAt']),
    updatedAt: isoDateTimeSchema.parse(obj['updatedAt']),
  };
});

export const adminPlansListResponseSchema: Schema<AdminPlansListResponse> = createSchema(
  (data: unknown) => {
    const obj = (data !== null && typeof data === 'object' ? data : {}) as Record<string, unknown>;
    if (!Array.isArray(obj['plans'])) {
      throw new Error('plans must be an array');
    }
    return {
      plans: obj['plans'].map((item: unknown) => adminPlanSchema.parse(item)),
    };
  },
);

export const createPlanRequestSchema: Schema<CreatePlanRequest> = createSchema((data: unknown) => {
  const obj = (data !== null && typeof data === 'object' ? data : {}) as Record<string, unknown>;

  const rawFeatures = withDefault(obj['features'], []);
  if (!Array.isArray(rawFeatures)) {
    throw new Error('features must be an array');
  }

  return {
    name: parseString(obj['name'], 'name', { min: 1 }),
    description: parseOptional(obj['description'], (v) => parseString(v, 'description')),
    interval: planIntervalSchema.parse(obj['interval']),
    priceInCents: parseNumber(obj['priceInCents'], 'priceInCents', { min: 0 }),
    currency: parseOptional(obj['currency'], (v) => parseString(v, 'currency', { length: 3 })),
    features: (rawFeatures as unknown[]).map((item: unknown) => planFeatureSchema.parse(item)),
    trialDays: parseNumber(withDefault(obj['trialDays'], 0), 'trialDays'),
    isActive: parseOptional(obj['isActive'], (v) => parseBoolean(v, 'isActive')),
    sortOrder: parseOptional(obj['sortOrder'], (v) => parseNumber(v, 'sortOrder')),
  };
});

export const updatePlanRequestSchema: Schema<UpdatePlanRequest> = createSchema((data: unknown) => {
  const obj = (data !== null && typeof data === 'object' ? data : {}) as Record<string, unknown>;

  let features: PlanFeature[] | undefined;
  if (obj['features'] !== undefined) {
    if (!Array.isArray(obj['features'])) {
      throw new Error('features must be an array');
    }
    features = obj['features'].map((item: unknown) => planFeatureSchema.parse(item));
  }

  return {
    name: parseOptional(obj['name'], (v) => parseString(v, 'name', { min: 1 })),
    description:
      obj['description'] === undefined
        ? undefined
        : parseNullable(obj['description'], (v) => parseString(v, 'description')),
    interval: parseOptional(obj['interval'], (v) => planIntervalSchema.parse(v)),
    priceInCents: parseOptional(obj['priceInCents'], (v) =>
      parseNumber(v, 'priceInCents', { min: 0 }),
    ),
    currency: parseOptional(obj['currency'], (v) => parseString(v, 'currency', { length: 3 })),
    features,
    trialDays: parseOptional(obj['trialDays'], (v) => parseNumber(v, 'trialDays')),
    isActive: parseOptional(obj['isActive'], (v) => parseBoolean(v, 'isActive')),
    sortOrder: parseOptional(obj['sortOrder'], (v) => parseNumber(v, 'sortOrder')),
  };
});

export const adminPlanResponseSchema: Schema<AdminPlanResponse> = createSchema((data: unknown) => {
  const obj = (data !== null && typeof data === 'object' ? data : {}) as Record<string, unknown>;
  return { plan: adminPlanSchema.parse(obj['plan']) };
});

export const syncStripeResponseSchema: Schema<SyncStripeResponse> = createSchema(
  (data: unknown) => {
    const obj = (data !== null && typeof data === 'object' ? data : {}) as Record<string, unknown>;
    return {
      success: parseBoolean(obj['success'], 'success'),
      stripePriceId: parseString(obj['stripePriceId'], 'stripePriceId'),
      stripeProductId: parseString(obj['stripeProductId'], 'stripeProductId'),
    };
  },
);

export const adminBillingStatsSchema: Schema<AdminBillingStats> = createSchema((data: unknown) => {
  const obj = (data !== null && typeof data === 'object' ? data : {}) as Record<string, unknown>;
  return {
    totalRevenue: parseNumber(obj['totalRevenue'], 'totalRevenue'),
    activeSubscriptions: parseNumber(obj['activeSubscriptions'], 'activeSubscriptions'),
    churnRate: parseNumber(obj['churnRate'], 'churnRate'),
    mrr: parseNumber(obj['mrr'], 'mrr'),
  };
});
