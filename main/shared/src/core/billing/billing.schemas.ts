// main/shared/src/core/billing/billing.schemas.ts

/**
 * @file Billing Schemas
 * @description Schemas and types for plans, subscriptions, invoices, and payments.
 * @module Core/Billing
 */

import {
  BILLING_EVENT_TYPES,
  BILLING_PROVIDERS,
  FEATURE_KEYS,
  INVOICE_STATUSES,
  PAYMENT_METHOD_TYPES,
  PLAN_INTERVALS,
  SUBSCRIPTION_STATUSES,
} from '../constants/billing';
import { planIdSchema, subscriptionIdSchema, userIdSchema } from '../../primitives/schema/ids';
import {
  createEnumSchema,
  createSchema,
  createUnionSchema,
  parseBoolean,
  parseNullable,
  parseNumber,
  parseOptional,
  parseString,
  withDefault,
} from '../schema.utils';
import { isoDateTimeSchema } from '../schemas';

import type { Schema } from '../../primitives/api';
import type { PlanId, SubscriptionId, UserId } from '../../primitives/schema/ids';

// ============================================================================
// Types
// ============================================================================

export type BillingProvider = (typeof BILLING_PROVIDERS)[number];

export type PlanInterval = (typeof PLAN_INTERVALS)[number];

export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number];

export type InvoiceStatus = (typeof INVOICE_STATUSES)[number];

export type PaymentMethodType = (typeof PAYMENT_METHOD_TYPES)[number];

/** Billing event types normalized from provider webhooks (must match DB BillingEventType) */
export type BillingEventType = (typeof BILLING_EVENT_TYPES)[number];

export type FeatureKey = (typeof FEATURE_KEYS)[keyof typeof FEATURE_KEYS];

/** @deprecated Use FEATURE_KEYS instead */
export type PlanFeatureName = FeatureKey;

/** Enum schemas */
const billingProviderSchema = createEnumSchema(BILLING_PROVIDERS, 'billing provider');
const planIntervalSchema = createEnumSchema(PLAN_INTERVALS, 'plan interval');
const subscriptionStatusSchema = createEnumSchema(SUBSCRIPTION_STATUSES, 'subscription status');
const invoiceStatusSchema = createEnumSchema(INVOICE_STATUSES, 'invoice status');
const paymentMethodTypeSchema = createEnumSchema(PAYMENT_METHOD_TYPES, 'payment method type');

// Limit feature keys
const LIMIT_FEATURE_KEYS = [
  FEATURE_KEYS.PROJECTS,
  FEATURE_KEYS.STORAGE,
  FEATURE_KEYS.MEDIA_MAX_FILE_SIZE_MB,
] as const;
const limitFeatureKeySchema = createEnumSchema(LIMIT_FEATURE_KEYS, 'limit feature key');

// Toggle feature keys
const TOGGLE_FEATURE_KEYS = [
  FEATURE_KEYS.TEAM_MEMBERS,
  FEATURE_KEYS.API_ACCESS,
  FEATURE_KEYS.CUSTOM_BRANDING,
  FEATURE_KEYS.MEDIA_PROCESSING,
] as const;
const toggleFeatureKeySchema = createEnumSchema(TOGGLE_FEATURE_KEYS, 'toggle feature key');

// ============================================================================
// Types
// ============================================================================

/** Plan feature (limit or toggle type) */
export type PlanFeature =
  | {
      key: (typeof LIMIT_FEATURE_KEYS)[number];
      name: string;
      included: boolean;
      value: number;
      description?: string | undefined;
    }
  | {
      key: (typeof TOGGLE_FEATURE_KEYS)[number];
      name: string;
      included: boolean;
      value?: boolean | undefined;
      description?: string | undefined;
    };

/** Plan entity */
export interface Plan {
  id: PlanId;
  name: string;
  description: string | null;
  interval: PlanInterval;
  priceInCents: number;
  currency: string;
  features: PlanFeature[];
  trialDays: number;
  isActive: boolean;
  sortOrder: number;
}

export interface PlansListResponse {
  plans: Plan[];
}

export interface Subscription {
  id: SubscriptionId;
  userId: UserId;
  planId: PlanId;
  plan: Plan;
  provider: BillingProvider;
  status: SubscriptionStatus;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  canceledAt: string | null;
  trialEnd: string | null;
  createdAt: string;
}

export interface SubscriptionResponse {
  subscription: Subscription | null;
}

export interface CheckoutRequest {
  planId: PlanId;
  successUrl?: string | undefined;
  cancelUrl?: string | undefined;
}

export interface CheckoutResponse {
  sessionId: string;
  url: string;
}

export interface PortalSessionRequest {
  returnUrl?: string | undefined;
}

export interface PortalSessionResult {
  url: string;
}

export interface CancelSubscriptionRequest {
  immediately: boolean;
}

export interface UpdateSubscriptionRequest {
  planId: PlanId;
}

export interface SubscriptionActionResponse {
  success: boolean;
  message: string;
}

export interface Invoice {
  id: string;
  status: InvoiceStatus;
  amountDue: number;
  amountPaid: number;
  currency: string;
  periodStart: string;
  periodEnd: string;
  paidAt: string | null;
  invoicePdfUrl: string | null;
  createdAt: string;
}

export interface InvoiceResponse {
  invoice: Invoice;
}

export interface InvoicesListResponse {
  invoices: Invoice[];
  hasMore: boolean;
}

export interface CardDetails {
  brand: string;
  last4: string;
  expMonth: number;
  expYear: number;
}

export interface PaymentMethod {
  id: string;
  type: PaymentMethodType;
  isDefault: boolean;
  cardDetails: CardDetails | null;
  createdAt: string;
}

export interface PaymentMethodsListResponse {
  paymentMethods: PaymentMethod[];
}

export interface AddPaymentMethodRequest {
  paymentMethodId: string;
}

export interface PaymentMethodResponse {
  paymentMethod: PaymentMethod;
}

export interface SetupIntentResponse {
  clientSecret: string;
}

// ============================================================================
// Plan Feature Schemas
// ============================================================================

/** Schema for limit-type plan features */
const limitFeatureSchema: Schema<PlanFeature> = createSchema((data: unknown) => {
  const obj = (data !== null && typeof data === 'object' ? data : {}) as Record<string, unknown>;
  return {
    key: limitFeatureKeySchema.parse(obj['key']),
    name: parseString(obj['name'], 'name'),
    included: parseBoolean(obj['included'], 'included'),
    value: parseNumber(obj['value'], 'value'),
    description: parseOptional(obj['description'], (v) => parseString(v, 'description')),
  };
});

/** Schema for toggle-type plan features */
const toggleFeatureSchema: Schema<PlanFeature> = createSchema((data: unknown) => {
  const obj = (data !== null && typeof data === 'object' ? data : {}) as Record<string, unknown>;
  return {
    key: toggleFeatureKeySchema.parse(obj['key']),
    name: parseString(obj['name'], 'name'),
    included: parseBoolean(obj['included'], 'included'),
    value: parseOptional(obj['value'], (v) => parseBoolean(v, 'value')),
    description: parseOptional(obj['description'], (v) => parseString(v, 'description')),
  };
});

export const planFeatureSchema: Schema<PlanFeature> = createUnionSchema([
  limitFeatureSchema,
  toggleFeatureSchema,
]);

// ============================================================================
// Schemas
// ============================================================================

export const planSchema: Schema<Plan> = createSchema((data: unknown) => {
  const obj = (data !== null && typeof data === 'object' ? data : {}) as Record<string, unknown>;

  if (!Array.isArray(obj['features'])) {
    throw new Error('features must be an array');
  }

  return {
    id: planIdSchema.parse(obj['id']),
    name: parseString(obj['name'], 'name'),
    description: parseNullable(obj['description'], (v) => parseString(v, 'description')),
    interval: planIntervalSchema.parse(obj['interval']),
    priceInCents: parseNumber(obj['priceInCents'], 'priceInCents', { min: 0 }),
    currency: parseString(obj['currency'], 'currency', { length: 3 }),
    features: obj['features'].map((item: unknown) => planFeatureSchema.parse(item)),
    trialDays: parseNumber(obj['trialDays'], 'trialDays', { min: 0 }),
    isActive: parseBoolean(obj['isActive'], 'isActive'),
    sortOrder: parseNumber(obj['sortOrder'], 'sortOrder'),
  };
});

export const plansListResponseSchema: Schema<PlansListResponse> = createSchema((data: unknown) => {
  const obj = (data !== null && typeof data === 'object' ? data : {}) as Record<string, unknown>;
  if (!Array.isArray(obj['plans'])) {
    throw new Error('plans must be an array');
  }
  return { plans: obj['plans'].map((item: unknown) => planSchema.parse(item)) };
});

export const subscriptionSchema: Schema<Subscription> = createSchema((data: unknown) => {
  const obj = (data !== null && typeof data === 'object' ? data : {}) as Record<string, unknown>;

  return {
    id: subscriptionIdSchema.parse(obj['id']),
    userId: userIdSchema.parse(obj['userId']),
    planId: planIdSchema.parse(obj['planId']),
    plan: planSchema.parse(obj['plan']),
    provider: billingProviderSchema.parse(obj['provider']),
    status: subscriptionStatusSchema.parse(obj['status']),
    currentPeriodStart: isoDateTimeSchema.parse(obj['currentPeriodStart']),
    currentPeriodEnd: isoDateTimeSchema.parse(obj['currentPeriodEnd']),
    cancelAtPeriodEnd: parseBoolean(obj['cancelAtPeriodEnd'], 'cancelAtPeriodEnd'),
    canceledAt: parseNullable(obj['canceledAt'], (v) => isoDateTimeSchema.parse(v)),
    trialEnd: parseNullable(obj['trialEnd'], (v) => isoDateTimeSchema.parse(v)),
    createdAt: isoDateTimeSchema.parse(obj['createdAt']),
  };
});

export const subscriptionResponseSchema: Schema<SubscriptionResponse> = createSchema(
  (data: unknown) => {
    const obj = (data !== null && typeof data === 'object' ? data : {}) as Record<string, unknown>;
    return {
      subscription: parseNullable(obj['subscription'], (v) => subscriptionSchema.parse(v)),
    };
  },
);

export const checkoutRequestSchema: Schema<CheckoutRequest> = createSchema((data: unknown) => {
  const obj = (data !== null && typeof data === 'object' ? data : {}) as Record<string, unknown>;
  return {
    planId: planIdSchema.parse(obj['planId']),
    successUrl: parseOptional(obj['successUrl'], (v) => parseString(v, 'successUrl')),
    cancelUrl: parseOptional(obj['cancelUrl'], (v) => parseString(v, 'cancelUrl')),
  };
});

export const checkoutResponseSchema: Schema<CheckoutResponse> = createSchema((data: unknown) => {
  const obj = (data !== null && typeof data === 'object' ? data : {}) as Record<string, unknown>;
  return {
    sessionId: parseString(obj['sessionId'], 'sessionId'),
    url: parseString(obj['url'], 'url'),
  };
});

export const portalSessionRequestSchema: Schema<PortalSessionRequest> = createSchema(
  (data: unknown) => {
    const obj = (data !== null && typeof data === 'object' ? data : {}) as Record<string, unknown>;
    return {
      returnUrl: parseOptional(obj['returnUrl'], (v) => parseString(v, 'returnUrl')),
    };
  },
);

export const portalSessionResultSchema: Schema<PortalSessionResult> = createSchema(
  (data: unknown) => {
    const obj = (data !== null && typeof data === 'object' ? data : {}) as Record<string, unknown>;
    return {
      url: parseString(obj['url'], 'url'),
    };
  },
);

export const cancelSubscriptionRequestSchema: Schema<CancelSubscriptionRequest> = createSchema(
  (data: unknown) => {
    const obj = (data !== null && typeof data === 'object' ? data : {}) as Record<string, unknown>;
    return {
      immediately: parseBoolean(withDefault(obj['immediately'], false), 'immediately'),
    };
  },
);

export const updateSubscriptionRequestSchema: Schema<UpdateSubscriptionRequest> = createSchema(
  (data: unknown) => {
    const obj = (data !== null && typeof data === 'object' ? data : {}) as Record<string, unknown>;
    return { planId: planIdSchema.parse(obj['planId']) };
  },
);

export const subscriptionActionResponseSchema: Schema<SubscriptionActionResponse> = createSchema(
  (data: unknown) => {
    const obj = (data !== null && typeof data === 'object' ? data : {}) as Record<string, unknown>;
    return {
      success: parseBoolean(obj['success'], 'success'),
      message: parseString(obj['message'], 'message'),
    };
  },
);

export const invoiceSchema: Schema<Invoice> = createSchema((data: unknown) => {
  const obj = (data !== null && typeof data === 'object' ? data : {}) as Record<string, unknown>;
  return {
    id: parseString(obj['id'], 'id'),
    status: invoiceStatusSchema.parse(obj['status']),
    amountDue: parseNumber(obj['amountDue'], 'amountDue'),
    amountPaid: parseNumber(obj['amountPaid'], 'amountPaid'),
    currency: parseString(obj['currency'], 'currency', { length: 3 }),
    periodStart: isoDateTimeSchema.parse(obj['periodStart']),
    periodEnd: isoDateTimeSchema.parse(obj['periodEnd']),
    paidAt: parseNullable(obj['paidAt'], (v) => isoDateTimeSchema.parse(v)),
    invoicePdfUrl: parseNullable(obj['invoicePdfUrl'], (v) => parseString(v, 'invoicePdfUrl')),
    createdAt: isoDateTimeSchema.parse(obj['createdAt']),
  };
});

export const invoicesListResponseSchema: Schema<InvoicesListResponse> = createSchema(
  (data: unknown) => {
    const obj = (data !== null && typeof data === 'object' ? data : {}) as Record<string, unknown>;
    if (!Array.isArray(obj['invoices'])) {
      throw new Error('invoices must be an array');
    }
    return {
      invoices: obj['invoices'].map((item: unknown) => invoiceSchema.parse(item)),
      hasMore: parseBoolean(obj['hasMore'], 'hasMore'),
    };
  },
);

export const invoiceResponseSchema: Schema<InvoiceResponse> = createSchema((data: unknown) => {
  const obj = (data !== null && typeof data === 'object' ? data : {}) as Record<string, unknown>;
  return {
    invoice: invoiceSchema.parse(obj['invoice']),
  };
});

export const cardDetailsSchema: Schema<CardDetails> = createSchema((data: unknown) => {
  const obj = (data !== null && typeof data === 'object' ? data : {}) as Record<string, unknown>;
  return {
    brand: parseString(obj['brand'], 'brand'),
    last4: parseString(obj['last4'], 'last4'),
    expMonth: parseNumber(obj['expMonth'], 'expMonth'),
    expYear: parseNumber(obj['expYear'], 'expYear'),
  };
});

export const paymentMethodSchema: Schema<PaymentMethod> = createSchema((data: unknown) => {
  const obj = (data !== null && typeof data === 'object' ? data : {}) as Record<string, unknown>;
  return {
    id: parseString(obj['id'], 'id'),
    type: paymentMethodTypeSchema.parse(obj['type']),
    isDefault: parseBoolean(obj['isDefault'], 'isDefault'),
    cardDetails: parseNullable(obj['cardDetails'], (v) => cardDetailsSchema.parse(v)),
    createdAt: isoDateTimeSchema.parse(obj['createdAt']),
  };
});

export const paymentMethodsListResponseSchema: Schema<PaymentMethodsListResponse> = createSchema(
  (data: unknown) => {
    const obj = (data !== null && typeof data === 'object' ? data : {}) as Record<string, unknown>;
    if (!Array.isArray(obj['paymentMethods'])) {
      throw new Error('paymentMethods must be an array');
    }
    return {
      paymentMethods: obj['paymentMethods'].map((item: unknown) => paymentMethodSchema.parse(item)),
    };
  },
);

export const addPaymentMethodRequestSchema: Schema<AddPaymentMethodRequest> = createSchema(
  (data: unknown) => {
    const obj = (data !== null && typeof data === 'object' ? data : {}) as Record<string, unknown>;
    return { paymentMethodId: parseString(obj['paymentMethodId'], 'paymentMethodId') };
  },
);

export const paymentMethodResponseSchema: Schema<PaymentMethodResponse> = createSchema(
  (data: unknown) => {
    const obj = (data !== null && typeof data === 'object' ? data : {}) as Record<string, unknown>;
    return { paymentMethod: paymentMethodSchema.parse(obj['paymentMethod']) };
  },
);

export const setupIntentResponseSchema: Schema<SetupIntentResponse> = createSchema(
  (data: unknown) => {
    const obj = (data !== null && typeof data === 'object' ? data : {}) as Record<string, unknown>;
    return { clientSecret: parseString(obj['clientSecret'], 'clientSecret') };
  },
);
