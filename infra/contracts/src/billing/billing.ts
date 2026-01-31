// infra/contracts/src/billing/billing.ts
/**
 * Billing Contract
 *
 * API contracts for billing operations including subscriptions,
 * payment methods, invoices, and admin plan management.
 */

import { errorResponseSchema, uuidSchema } from '../common';
import { createSchema } from '../schema';

import type { Contract, Schema } from '../types';

// ============================================================================
// Constants
// ============================================================================

export const BILLING_PROVIDERS = ['stripe', 'paypal'] as const;
export const PLAN_INTERVALS = ['month', 'year'] as const;
export const SUBSCRIPTION_STATUSES = [
  'active',
  'canceled',
  'incomplete',
  'incomplete_expired',
  'past_due',
  'paused',
  'trialing',
  'unpaid',
] as const;
export const INVOICE_STATUSES = ['draft', 'open', 'paid', 'void', 'uncollectible'] as const;
export const PAYMENT_METHOD_TYPES = ['card', 'bank_account', 'paypal'] as const;

// ============================================================================
// Types
// ============================================================================

export type BillingProvider = (typeof BILLING_PROVIDERS)[number];
export type PlanInterval = (typeof PLAN_INTERVALS)[number];
export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number];
export type InvoiceStatus = (typeof INVOICE_STATUSES)[number];
export type PaymentMethodType = (typeof PAYMENT_METHOD_TYPES)[number];

// ============================================================================
// Shared Types
// ============================================================================

export interface PlanFeature {
  name: string;
  included: boolean;
  description?: string | undefined;
}

export interface CardDetails {
  brand: string;
  last4: string;
  expMonth: number;
  expYear: number;
}

// ============================================================================
// Plan Schemas
// ============================================================================

export interface Plan {
  id: string;
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

export const planSchema: Schema<Plan> = createSchema((data: unknown) => {
  if (data === null || data === undefined || typeof data !== 'object') {
    throw new Error('Invalid plan data');
  }
  const obj = data as Record<string, unknown>;

  if (typeof obj['id'] !== 'string') throw new Error('Plan id must be a string');
  if (typeof obj['name'] !== 'string') throw new Error('Plan name must be a string');
  if (obj['description'] !== null && typeof obj['description'] !== 'string') {
    throw new Error('Plan description must be a string or null');
  }
  if (!PLAN_INTERVALS.includes(obj['interval'] as PlanInterval)) {
    throw new Error('Invalid plan interval');
  }
  if (typeof obj['priceInCents'] !== 'number' || obj['priceInCents'] < 0) {
    throw new Error('Plan priceInCents must be a non-negative number');
  }
  if (typeof obj['currency'] !== 'string') throw new Error('Plan currency must be a string');
  if (!Array.isArray(obj['features'])) throw new Error('Plan features must be an array');
  if (typeof obj['trialDays'] !== 'number' || obj['trialDays'] < 0) {
    throw new Error('Plan trialDays must be a non-negative number');
  }
  if (typeof obj['isActive'] !== 'boolean') throw new Error('Plan isActive must be a boolean');
  if (typeof obj['sortOrder'] !== 'number') throw new Error('Plan sortOrder must be a number');

  return {
    id: obj['id'],
    name: obj['name'],
    description: obj['description'],
    interval: obj['interval'] as PlanInterval,
    priceInCents: obj['priceInCents'],
    currency: obj['currency'],
    features: obj['features'] as PlanFeature[],
    trialDays: obj['trialDays'],
    isActive: obj['isActive'],
    sortOrder: obj['sortOrder'],
  };
});

export interface PlansListResponse {
  plans: Plan[];
}

export const plansListResponseSchema: Schema<PlansListResponse> = createSchema((data: unknown) => {
  if (data === null || data === undefined || typeof data !== 'object') {
    throw new Error('Invalid plans list response');
  }
  const obj = data as Record<string, unknown>;
  if (!Array.isArray(obj['plans'])) throw new Error('plans must be an array');
  return {
    plans: obj['plans'].map((p) => planSchema.parse(p)),
  };
});

// ============================================================================
// Subscription Schemas
// ============================================================================

export interface Subscription {
  id: string;
  userId: string;
  planId: string;
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

export const subscriptionSchema: Schema<Subscription> = createSchema((data: unknown) => {
  if (data === null || data === undefined || typeof data !== 'object') {
    throw new Error('Invalid subscription data');
  }
  const obj = data as Record<string, unknown>;

  if (typeof obj['id'] !== 'string') throw new Error('Subscription id must be a string');
  if (typeof obj['userId'] !== 'string') throw new Error('Subscription userId must be a string');
  if (typeof obj['planId'] !== 'string') throw new Error('Subscription planId must be a string');
  if (!BILLING_PROVIDERS.includes(obj['provider'] as BillingProvider)) {
    throw new Error('Invalid billing provider');
  }
  if (!SUBSCRIPTION_STATUSES.includes(obj['status'] as SubscriptionStatus)) {
    throw new Error('Invalid subscription status');
  }
  if (typeof obj['currentPeriodStart'] !== 'string') {
    throw new Error('currentPeriodStart must be a string');
  }
  if (typeof obj['currentPeriodEnd'] !== 'string') {
    throw new Error('currentPeriodEnd must be a string');
  }
  if (typeof obj['cancelAtPeriodEnd'] !== 'boolean') {
    throw new Error('cancelAtPeriodEnd must be a boolean');
  }
  if (obj['canceledAt'] !== null && typeof obj['canceledAt'] !== 'string') {
    throw new Error('canceledAt must be a string or null');
  }
  if (obj['trialEnd'] !== null && typeof obj['trialEnd'] !== 'string') {
    throw new Error('trialEnd must be a string or null');
  }
  if (typeof obj['createdAt'] !== 'string') throw new Error('createdAt must be a string');

  return {
    id: obj['id'],
    userId: obj['userId'],
    planId: obj['planId'],
    plan: planSchema.parse(obj['plan']),
    provider: obj['provider'] as BillingProvider,
    status: obj['status'] as SubscriptionStatus,
    currentPeriodStart: obj['currentPeriodStart'],
    currentPeriodEnd: obj['currentPeriodEnd'],
    cancelAtPeriodEnd: obj['cancelAtPeriodEnd'],
    canceledAt: obj['canceledAt'],
    trialEnd: obj['trialEnd'],
    createdAt: obj['createdAt'],
  };
});

export interface SubscriptionResponse {
  subscription: Subscription | null;
}

export const subscriptionResponseSchema: Schema<SubscriptionResponse> = createSchema(
  (data: unknown) => {
    if (data === null || data === undefined || typeof data !== 'object') {
      throw new Error('Invalid subscription response');
    }
    const obj = data as Record<string, unknown>;
    return {
      subscription: obj['subscription'] === null ? null : subscriptionSchema.parse(obj['subscription']),
    };
  },
);

// ============================================================================
// Checkout Schemas
// ============================================================================

export interface CheckoutRequest {
  planId: string;
  successUrl?: string | undefined;
  cancelUrl?: string | undefined;
}

export const checkoutRequestSchema: Schema<CheckoutRequest> = createSchema((data: unknown) => {
  if (data === null || data === undefined || typeof data !== 'object') {
    throw new Error('Invalid checkout request');
  }
  const obj = data as Record<string, unknown>;
  const planId = uuidSchema.parse(obj['planId']);
  return {
    planId,
    successUrl: typeof obj['successUrl'] === 'string' ? obj['successUrl'] : undefined,
    cancelUrl: typeof obj['cancelUrl'] === 'string' ? obj['cancelUrl'] : undefined,
  };
});

export interface CheckoutResponse {
  sessionId: string;
  url: string;
}

export const checkoutResponseSchema: Schema<CheckoutResponse> = createSchema((data: unknown) => {
  if (data === null || data === undefined || typeof data !== 'object') {
    throw new Error('Invalid checkout response');
  }
  const obj = data as Record<string, unknown>;
  if (typeof obj['sessionId'] !== 'string') throw new Error('sessionId must be a string');
  if (typeof obj['url'] !== 'string') throw new Error('url must be a string');
  return {
    sessionId: obj['sessionId'],
    url: obj['url'],
  };
});

// ============================================================================
// Subscription Action Schemas
// ============================================================================

export interface CancelSubscriptionRequest {
  immediately?: boolean;
}

export const cancelSubscriptionRequestSchema: Schema<CancelSubscriptionRequest> = createSchema(
  (data: unknown) => {
    if (data === undefined || data === null) {
      return { immediately: false };
    }
    if (typeof data !== 'object') {
      throw new Error('Invalid cancel subscription request');
    }
    const obj = data as Record<string, unknown>;
    return {
      immediately: typeof obj['immediately'] === 'boolean' ? obj['immediately'] : false,
    };
  },
);

export interface SubscriptionActionResponse {
  success: boolean;
  message: string;
}

export const subscriptionActionResponseSchema: Schema<SubscriptionActionResponse> = createSchema(
  (data: unknown) => {
    if (data === null || data === undefined || typeof data !== 'object') {
      throw new Error('Invalid subscription action response');
    }
    const obj = data as Record<string, unknown>;
    if (typeof obj['success'] !== 'boolean') throw new Error('success must be a boolean');
    if (typeof obj['message'] !== 'string') throw new Error('message must be a string');
    return {
      success: obj['success'],
      message: obj['message'],
    };
  },
);

export interface UpdateSubscriptionRequest {
  planId: string;
}

export const updateSubscriptionRequestSchema: Schema<UpdateSubscriptionRequest> = createSchema(
  (data: unknown) => {
    if (data === null || data === undefined || typeof data !== 'object') {
      throw new Error('Invalid update subscription request');
    }
    const obj = data as Record<string, unknown>;
    return {
      planId: uuidSchema.parse(obj['planId']),
    };
  },
);

// ============================================================================
// Invoice Schemas
// ============================================================================

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

export const invoiceSchema: Schema<Invoice> = createSchema((data: unknown) => {
  if (data === null || data === undefined || typeof data !== 'object') {
    throw new Error('Invalid invoice data');
  }
  const obj = data as Record<string, unknown>;

  if (typeof obj['id'] !== 'string') throw new Error('Invoice id must be a string');
  if (!INVOICE_STATUSES.includes(obj['status'] as InvoiceStatus)) {
    throw new Error('Invalid invoice status');
  }
  if (typeof obj['amountDue'] !== 'number') throw new Error('amountDue must be a number');
  if (typeof obj['amountPaid'] !== 'number') throw new Error('amountPaid must be a number');
  if (typeof obj['currency'] !== 'string') throw new Error('currency must be a string');
  if (typeof obj['periodStart'] !== 'string') throw new Error('periodStart must be a string');
  if (typeof obj['periodEnd'] !== 'string') throw new Error('periodEnd must be a string');
  if (obj['paidAt'] !== null && typeof obj['paidAt'] !== 'string') {
    throw new Error('paidAt must be a string or null');
  }
  if (obj['invoicePdfUrl'] !== null && typeof obj['invoicePdfUrl'] !== 'string') {
    throw new Error('invoicePdfUrl must be a string or null');
  }
  if (typeof obj['createdAt'] !== 'string') throw new Error('createdAt must be a string');

  return {
    id: obj['id'],
    status: obj['status'] as InvoiceStatus,
    amountDue: obj['amountDue'],
    amountPaid: obj['amountPaid'],
    currency: obj['currency'],
    periodStart: obj['periodStart'],
    periodEnd: obj['periodEnd'],
    paidAt: obj['paidAt'],
    invoicePdfUrl: obj['invoicePdfUrl'],
    createdAt: obj['createdAt'],
  };
});

export interface InvoicesListResponse {
  invoices: Invoice[];
  hasMore: boolean;
}

export const invoicesListResponseSchema: Schema<InvoicesListResponse> = createSchema(
  (data: unknown) => {
    if (data === null || data === undefined || typeof data !== 'object') {
      throw new Error('Invalid invoices list response');
    }
    const obj = data as Record<string, unknown>;
    if (!Array.isArray(obj['invoices'])) throw new Error('invoices must be an array');
    if (typeof obj['hasMore'] !== 'boolean') throw new Error('hasMore must be a boolean');
    return {
      invoices: obj['invoices'].map((i) => invoiceSchema.parse(i)),
      hasMore: obj['hasMore'],
    };
  },
);

// ============================================================================
// Payment Method Schemas
// ============================================================================

export interface PaymentMethod {
  id: string;
  type: PaymentMethodType;
  isDefault: boolean;
  cardDetails: CardDetails | null;
  createdAt: string;
}

export const paymentMethodSchema: Schema<PaymentMethod> = createSchema((data: unknown) => {
  if (data === null || data === undefined || typeof data !== 'object') {
    throw new Error('Invalid payment method data');
  }
  const obj = data as Record<string, unknown>;

  if (typeof obj['id'] !== 'string') throw new Error('PaymentMethod id must be a string');
  if (!PAYMENT_METHOD_TYPES.includes(obj['type'] as PaymentMethodType)) {
    throw new Error('Invalid payment method type');
  }
  if (typeof obj['isDefault'] !== 'boolean') throw new Error('isDefault must be a boolean');
  if (typeof obj['createdAt'] !== 'string') throw new Error('createdAt must be a string');

  let cardDetails: CardDetails | null = null;
  if (obj['cardDetails'] !== null) {
    const cd = obj['cardDetails'] as Record<string, unknown>;
    if (
      typeof cd['brand'] !== 'string' ||
      typeof cd['last4'] !== 'string' ||
      typeof cd['expMonth'] !== 'number' ||
      typeof cd['expYear'] !== 'number'
    ) {
      throw new Error('Invalid card details');
    }
    cardDetails = {
      brand: cd['brand'],
      last4: cd['last4'],
      expMonth: cd['expMonth'],
      expYear: cd['expYear'],
    };
  }

  return {
    id: obj['id'],
    type: obj['type'] as PaymentMethodType,
    isDefault: obj['isDefault'],
    cardDetails,
    createdAt: obj['createdAt'],
  };
});

export interface PaymentMethodsListResponse {
  paymentMethods: PaymentMethod[];
}

export const paymentMethodsListResponseSchema: Schema<PaymentMethodsListResponse> = createSchema(
  (data: unknown) => {
    if (data === null || data === undefined || typeof data !== 'object') {
      throw new Error('Invalid payment methods list response');
    }
    const obj = data as Record<string, unknown>;
    if (!Array.isArray(obj['paymentMethods'])) throw new Error('paymentMethods must be an array');
    return {
      paymentMethods: obj['paymentMethods'].map((pm) => paymentMethodSchema.parse(pm)),
    };
  },
);

export interface AddPaymentMethodRequest {
  paymentMethodId: string;
}

export const addPaymentMethodRequestSchema: Schema<AddPaymentMethodRequest> = createSchema(
  (data: unknown) => {
    if (data === null || data === undefined || typeof data !== 'object') {
      throw new Error('Invalid add payment method request');
    }
    const obj = data as Record<string, unknown>;
    if (typeof obj['paymentMethodId'] !== 'string') {
      throw new Error('paymentMethodId must be a string');
    }
    return {
      paymentMethodId: obj['paymentMethodId'],
    };
  },
);

export interface PaymentMethodResponse {
  paymentMethod: PaymentMethod;
}

export const paymentMethodResponseSchema: Schema<PaymentMethodResponse> = createSchema(
  (data: unknown) => {
    if (data === null || data === undefined || typeof data !== 'object') {
      throw new Error('Invalid payment method response');
    }
    const obj = data as Record<string, unknown>;
    return {
      paymentMethod: paymentMethodSchema.parse(obj['paymentMethod']),
    };
  },
);

export interface SetupIntentResponse {
  clientSecret: string;
}

export const setupIntentResponseSchema: Schema<SetupIntentResponse> = createSchema(
  (data: unknown) => {
    if (data === null || data === undefined || typeof data !== 'object') {
      throw new Error('Invalid setup intent response');
    }
    const obj = data as Record<string, unknown>;
    if (typeof obj['clientSecret'] !== 'string') {
      throw new Error('clientSecret must be a string');
    }
    return {
      clientSecret: obj['clientSecret'],
    };
  },
);

// ============================================================================
// Admin Plan Management Schemas
// ============================================================================

export interface AdminPlan extends Plan {
  stripePriceId: string | null;
  stripeProductId: string | null;
  paypalPlanId: string | null;
  createdAt: string;
  updatedAt: string;
}

export const adminPlanSchema: Schema<AdminPlan> = createSchema((data: unknown) => {
  if (data === null || data === undefined || typeof data !== 'object') {
    throw new Error('Invalid admin plan data');
  }
  const obj = data as Record<string, unknown>;
  const basePlan = planSchema.parse(obj);

  if (obj['stripePriceId'] !== null && typeof obj['stripePriceId'] !== 'string') {
    throw new Error('stripePriceId must be a string or null');
  }
  if (obj['stripeProductId'] !== null && typeof obj['stripeProductId'] !== 'string') {
    throw new Error('stripeProductId must be a string or null');
  }
  if (obj['paypalPlanId'] !== null && typeof obj['paypalPlanId'] !== 'string') {
    throw new Error('paypalPlanId must be a string or null');
  }
  if (typeof obj['createdAt'] !== 'string') throw new Error('createdAt must be a string');
  if (typeof obj['updatedAt'] !== 'string') throw new Error('updatedAt must be a string');

  return {
    ...basePlan,
    stripePriceId: obj['stripePriceId'],
    stripeProductId: obj['stripeProductId'],
    paypalPlanId: obj['paypalPlanId'],
    createdAt: obj['createdAt'],
    updatedAt: obj['updatedAt'],
  };
});

export interface AdminPlansListResponse {
  plans: AdminPlan[];
}

export const adminPlansListResponseSchema: Schema<AdminPlansListResponse> = createSchema(
  (data: unknown) => {
    if (data === null || data === undefined || typeof data !== 'object') {
      throw new Error('Invalid admin plans list response');
    }
    const obj = data as Record<string, unknown>;
    if (!Array.isArray(obj['plans'])) throw new Error('plans must be an array');
    return {
      plans: obj['plans'].map((p) => adminPlanSchema.parse(p)),
    };
  },
);

export interface CreatePlanRequest {
  name: string;
  description?: string | undefined;
  interval: PlanInterval;
  priceInCents: number;
  currency?: string | undefined;
  features?: PlanFeature[] | undefined;
  trialDays?: number | undefined;
  isActive?: boolean | undefined;
  sortOrder?: number | undefined;
}

export const createPlanRequestSchema: Schema<CreatePlanRequest> = createSchema((data: unknown) => {
  if (data === null || data === undefined || typeof data !== 'object') {
    throw new Error('Invalid create plan request');
  }
  const obj = data as Record<string, unknown>;

  if (typeof obj['name'] !== 'string' || obj['name'].trim().length === 0) {
    throw new Error('Plan name is required');
  }
  if (!PLAN_INTERVALS.includes(obj['interval'] as PlanInterval)) {
    throw new Error('Invalid plan interval');
  }
  if (typeof obj['priceInCents'] !== 'number' || obj['priceInCents'] < 0) {
    throw new Error('priceInCents must be a non-negative number');
  }

  return {
    name: obj['name'].trim(),
    description: typeof obj['description'] === 'string' ? obj['description'] : undefined,
    interval: obj['interval'] as PlanInterval,
    priceInCents: obj['priceInCents'],
    currency: typeof obj['currency'] === 'string' ? obj['currency'] : undefined,
    features: Array.isArray(obj['features']) ? (obj['features'] as PlanFeature[]) : undefined,
    trialDays: typeof obj['trialDays'] === 'number' ? obj['trialDays'] : undefined,
    isActive: typeof obj['isActive'] === 'boolean' ? obj['isActive'] : undefined,
    sortOrder: typeof obj['sortOrder'] === 'number' ? obj['sortOrder'] : undefined,
  };
});

export interface UpdatePlanRequest {
  name?: string;
  description?: string | null;
  interval?: PlanInterval;
  priceInCents?: number;
  currency?: string;
  features?: PlanFeature[];
  trialDays?: number;
  isActive?: boolean;
  sortOrder?: number;
}

export const updatePlanRequestSchema: Schema<UpdatePlanRequest> = createSchema((data: unknown) => {
  if (data === null || data === undefined || typeof data !== 'object') {
    throw new Error('Invalid update plan request');
  }
  const obj = data as Record<string, unknown>;

  const result: UpdatePlanRequest = {};

  if (typeof obj['name'] === 'string') {
    if (obj['name'].trim().length === 0) throw new Error('Plan name cannot be empty');
    result.name = obj['name'].trim();
  }
  if (obj['description'] !== undefined) {
    if (obj['description'] === null) {
      result.description = null;
    } else if (typeof obj['description'] === 'string') {
      result.description = obj['description'];
    } else {
      throw new Error('Invalid plan description');
    }
  }
  if (obj['interval'] !== undefined) {
    if (!PLAN_INTERVALS.includes(obj['interval'] as PlanInterval)) {
      throw new Error('Invalid plan interval');
    }
    result.interval = obj['interval'] as PlanInterval;
  }
  if (typeof obj['priceInCents'] === 'number') {
    if (obj['priceInCents'] < 0) throw new Error('priceInCents must be non-negative');
    result.priceInCents = obj['priceInCents'];
  }
  if (typeof obj['currency'] === 'string') result.currency = obj['currency'];
  if (Array.isArray(obj['features'])) result.features = obj['features'] as PlanFeature[];
  if (typeof obj['trialDays'] === 'number') {
    if (obj['trialDays'] < 0) throw new Error('trialDays must be non-negative');
    result.trialDays = obj['trialDays'];
  }
  if (typeof obj['isActive'] === 'boolean') result.isActive = obj['isActive'];
  if (typeof obj['sortOrder'] === 'number') result.sortOrder = obj['sortOrder'];

  return result;
});

export interface AdminPlanResponse {
  plan: AdminPlan;
}

export const adminPlanResponseSchema: Schema<AdminPlanResponse> = createSchema((data: unknown) => {
  if (data === null || data === undefined || typeof data !== 'object') {
    throw new Error('Invalid admin plan response');
  }
  const obj = data as Record<string, unknown>;
  return {
    plan: adminPlanSchema.parse(obj['plan']),
  };
});

export interface SyncStripeResponse {
  success: boolean;
  stripePriceId: string;
  stripeProductId: string;
}

export const syncStripeResponseSchema: Schema<SyncStripeResponse> = createSchema(
  (data: unknown) => {
    if (data === null || data === undefined || typeof data !== 'object') {
      throw new Error('Invalid sync stripe response');
    }
    const obj = data as Record<string, unknown>;
    if (typeof obj['success'] !== 'boolean') throw new Error('success must be a boolean');
    if (typeof obj['stripePriceId'] !== 'string') throw new Error('stripePriceId must be a string');
    if (typeof obj['stripeProductId'] !== 'string')
      throw new Error('stripeProductId must be a string');
    return {
      success: obj['success'],
      stripePriceId: obj['stripePriceId'],
      stripeProductId: obj['stripeProductId'],
    };
  },
);

// ============================================================================
// Empty body for endpoints without request body
// ============================================================================

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface EmptyBillingBody {}

export const emptyBillingBodySchema: Schema<EmptyBillingBody> = createSchema((data: unknown) => {
  if (data !== undefined && data !== null && typeof data === 'object') {
    return {};
  }
  return {};
});

// ============================================================================
// Billing Contract (User Endpoints)
// ============================================================================

export const billingContract = {
  // Plans
  listPlans: {
    method: 'GET' as const,
    path: '/api/billing/plans',
    responses: {
      200: plansListResponseSchema,
    },
    summary: 'List all active pricing plans (public)',
  },

  // Subscription
  getSubscription: {
    method: 'GET' as const,
    path: '/api/billing/subscription',
    responses: {
      200: subscriptionResponseSchema,
      401: errorResponseSchema,
    },
    summary: 'Get current user subscription',
  },
  createCheckout: {
    method: 'POST' as const,
    path: '/api/billing/checkout',
    body: checkoutRequestSchema,
    responses: {
      200: checkoutResponseSchema,
      400: errorResponseSchema,
      401: errorResponseSchema,
    },
    summary: 'Create checkout session for subscription',
  },
  cancelSubscription: {
    method: 'POST' as const,
    path: '/api/billing/subscription/cancel',
    body: cancelSubscriptionRequestSchema,
    responses: {
      200: subscriptionActionResponseSchema,
      400: errorResponseSchema,
      401: errorResponseSchema,
      404: errorResponseSchema,
    },
    summary: 'Cancel current subscription',
  },
  resumeSubscription: {
    method: 'POST' as const,
    path: '/api/billing/subscription/resume',
    body: emptyBillingBodySchema,
    responses: {
      200: subscriptionActionResponseSchema,
      400: errorResponseSchema,
      401: errorResponseSchema,
      404: errorResponseSchema,
    },
    summary: 'Resume subscription before period end',
  },
  updateSubscription: {
    method: 'POST' as const,
    path: '/api/billing/subscription/update',
    body: updateSubscriptionRequestSchema,
    responses: {
      200: subscriptionActionResponseSchema,
      400: errorResponseSchema,
      401: errorResponseSchema,
      404: errorResponseSchema,
    },
    summary: 'Change subscription plan',
  },

  // Invoices
  listInvoices: {
    method: 'GET' as const,
    path: '/api/billing/invoices',
    responses: {
      200: invoicesListResponseSchema,
      401: errorResponseSchema,
    },
    summary: 'List user invoices',
  },

  // Payment Methods
  listPaymentMethods: {
    method: 'GET' as const,
    path: '/api/billing/payment-methods',
    responses: {
      200: paymentMethodsListResponseSchema,
      401: errorResponseSchema,
    },
    summary: 'List saved payment methods',
  },
  addPaymentMethod: {
    method: 'POST' as const,
    path: '/api/billing/payment-methods',
    body: addPaymentMethodRequestSchema,
    responses: {
      200: paymentMethodResponseSchema,
      400: errorResponseSchema,
      401: errorResponseSchema,
    },
    summary: 'Add a payment method',
  },
  removePaymentMethod: {
    method: 'DELETE' as const,
    path: '/api/billing/payment-methods/:id',
    responses: {
      200: subscriptionActionResponseSchema,
      400: errorResponseSchema,
      401: errorResponseSchema,
      404: errorResponseSchema,
    },
    summary: 'Remove a payment method',
  },
  setDefaultPaymentMethod: {
    method: 'POST' as const,
    path: '/api/billing/payment-methods/:id/default',
    body: emptyBillingBodySchema,
    responses: {
      200: paymentMethodResponseSchema,
      400: errorResponseSchema,
      401: errorResponseSchema,
      404: errorResponseSchema,
    },
    summary: 'Set payment method as default',
  },
  createSetupIntent: {
    method: 'POST' as const,
    path: '/api/billing/setup-intent',
    body: emptyBillingBodySchema,
    responses: {
      200: setupIntentResponseSchema,
      400: errorResponseSchema,
      401: errorResponseSchema,
    },
    summary: 'Create Stripe SetupIntent for adding card',
  },
} satisfies Contract;

// ============================================================================
// Admin Billing Contract
// ============================================================================

export const adminBillingContract = {
  listPlans: {
    method: 'GET' as const,
    path: '/api/admin/billing/plans',
    responses: {
      200: adminPlansListResponseSchema,
      401: errorResponseSchema,
      403: errorResponseSchema,
    },
    summary: 'List all plans (including inactive) - Admin only',
  },
  createPlan: {
    method: 'POST' as const,
    path: '/api/admin/billing/plans',
    body: createPlanRequestSchema,
    responses: {
      201: adminPlanResponseSchema,
      400: errorResponseSchema,
      401: errorResponseSchema,
      403: errorResponseSchema,
    },
    summary: 'Create a new plan - Admin only',
  },
  updatePlan: {
    method: 'PATCH' as const,
    path: '/api/admin/billing/plans/:id',
    body: updatePlanRequestSchema,
    responses: {
      200: adminPlanResponseSchema,
      400: errorResponseSchema,
      401: errorResponseSchema,
      403: errorResponseSchema,
      404: errorResponseSchema,
    },
    summary: 'Update a plan - Admin only',
  },
  syncPlanToStripe: {
    method: 'POST' as const,
    path: '/api/admin/billing/plans/:id/sync-stripe',
    body: emptyBillingBodySchema,
    responses: {
      200: syncStripeResponseSchema,
      400: errorResponseSchema,
      401: errorResponseSchema,
      403: errorResponseSchema,
      404: errorResponseSchema,
    },
    summary: 'Sync plan to Stripe - Admin only',
  },
  deactivatePlan: {
    method: 'DELETE' as const,
    path: '/api/admin/billing/plans/:id',
    responses: {
      200: subscriptionActionResponseSchema,
      400: errorResponseSchema,
      401: errorResponseSchema,
      403: errorResponseSchema,
      404: errorResponseSchema,
    },
    summary: 'Deactivate a plan - Admin only',
  },
} satisfies Contract;
