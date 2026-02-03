// shared/src/domain/billing/admin.schemas.ts
import { z } from 'zod';

import { isoDateTimeSchema } from '../../core/schemas';

import { PLAN_INTERVALS, planFeatureSchema, planSchema } from './billing.schemas';

export const adminPlanSchema = planSchema.extend({
  stripePriceId: z.string().nullable(),
  stripeProductId: z.string().nullable(),
  paypalPlanId: z.string().nullable(),
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
});

export type AdminPlan = z.infer<typeof adminPlanSchema>;

export const adminPlansListResponseSchema = z.object({
  plans: z.array(adminPlanSchema),
});

export type AdminPlansListResponse = z.infer<typeof adminPlansListResponseSchema>;

export const createPlanRequestSchema = z.object({
  name: z.string().min(1, 'Plan name is required'),
  description: z.string().optional(),
  interval: z.enum(PLAN_INTERVALS),
  priceInCents: z.number().min(0),
  currency: z.string().length(3).optional(),
  features: z.array(planFeatureSchema).optional().default([]),
  trialDays: z.number().optional().default(0),
  isActive: z.boolean().optional(),
  sortOrder: z.number().optional(),
});

export type CreatePlanRequest = z.infer<typeof createPlanRequestSchema>;

export const updatePlanRequestSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  interval: z.enum(PLAN_INTERVALS).optional(),
  priceInCents: z.number().min(0).optional(),
  currency: z.string().length(3).optional(),
  features: z.array(planFeatureSchema).optional(),
  trialDays: z.number().optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().optional(),
});

export type UpdatePlanRequest = z.infer<typeof updatePlanRequestSchema>;

export const adminPlanResponseSchema = z.object({
  plan: adminPlanSchema,
});

export type AdminPlanResponse = z.infer<typeof adminPlanResponseSchema>;

export const syncStripeResponseSchema = z.object({
  success: z.boolean(),
  stripePriceId: z.string(),
  stripeProductId: z.string(),
});

export type SyncStripeResponse = z.infer<typeof syncStripeResponseSchema>;

export const adminBillingStatsSchema = z.object({
  totalRevenue: z.number(),
  activeSubscriptions: z.number(),
  churnRate: z.number(),
  mrr: z.number(),
});

export type AdminBillingStats = z.infer<typeof adminBillingStatsSchema>;

