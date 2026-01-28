// apps/server/src/modules/billing/routes.test.ts
/**
 * Billing Routes Tests
 *
 * Tests route registration and configuration for billing module.
 * Verifies correct HTTP methods, auth requirements, and handler invocation.
 */

import { describe, expect, it, vi, beforeEach, type Mock } from 'vitest';

import * as handlers from './handlers';
import { billingRoutes } from './routes';

import type { RouteResult } from '@router';
import type { AppContext } from '../../shared';

// ============================================================================
// Mocks
// ============================================================================

vi.mock('./handlers', () => ({
  handleListPlans: vi.fn(),
  handleGetSubscription: vi.fn(),
  handleCreateCheckout: vi.fn(),
  handleCancelSubscription: vi.fn(),
  handleResumeSubscription: vi.fn(),
  handleUpdateSubscription: vi.fn(),
  handleListInvoices: vi.fn(),
  handleListPaymentMethods: vi.fn(),
  handleAddPaymentMethod: vi.fn(),
  handleCreateSetupIntent: vi.fn(),
}));

// ============================================================================
// Test Helpers
// ============================================================================

/**
 * Create mock AppContext for testing
 */
function createMockContext(): AppContext {
  return {
    db: {} as AppContext['db'],
    logger: {
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
    } as AppContext['logger'],
    cache: {} as AppContext['cache'],
    config: {} as AppContext['config'],
  };
}

/**
 * Create mock request with user
 */
function createMockRequest(userId = 'test-user-id') {
  return {
    user: {
      userId,
      email: 'test@example.com',
      role: 'user',
    },
    headers: {},
    body: {},
  };
}

/**
 * Create mock request without user (for public routes)
 */
function createMockPublicRequest() {
  return {
    headers: {},
    body: {},
  };
}

// ============================================================================
// Route Structure Tests
// ============================================================================

describe('billingRoutes - Structure', () => {
  it('should export a RouteMap object', () => {
    expect(billingRoutes).toBeDefined();
    expect(typeof billingRoutes).toBe('object');
  });

  it('should contain all expected route paths', () => {
    const expectedPaths = [
      'billing/plans',
      'billing/subscription',
      'billing/checkout',
      'billing/subscription/cancel',
      'billing/subscription/resume',
      'billing/subscription/update',
      'billing/invoices',
      'billing/payment-methods',
      'billing/payment-methods/add',
      'billing/setup-intent',
    ];

    const actualPaths = Object.keys(billingRoutes);
    expect(actualPaths).toEqual(expect.arrayContaining(expectedPaths));
    expect(actualPaths).toHaveLength(expectedPaths.length);
  });

  it('should have correct HTTP methods for each route', () => {
    expect(billingRoutes['billing/plans'].method).toBe('GET');
    expect(billingRoutes['billing/subscription'].method).toBe('GET');
    expect(billingRoutes['billing/checkout'].method).toBe('POST');
    expect(billingRoutes['billing/subscription/cancel'].method).toBe('POST');
    expect(billingRoutes['billing/subscription/resume'].method).toBe('POST');
    expect(billingRoutes['billing/subscription/update'].method).toBe('POST');
    expect(billingRoutes['billing/invoices'].method).toBe('GET');
    expect(billingRoutes['billing/payment-methods'].method).toBe('GET');
    expect(billingRoutes['billing/payment-methods/add'].method).toBe('POST');
    expect(billingRoutes['billing/setup-intent'].method).toBe('POST');
  });

  it('should have correct auth configuration for each route', () => {
    // Public route
    expect(billingRoutes['billing/plans'].auth).toBeUndefined();

    // Protected routes (user)
    expect(billingRoutes['billing/subscription'].auth).toBe('user');
    expect(billingRoutes['billing/checkout'].auth).toBe('user');
    expect(billingRoutes['billing/subscription/cancel'].auth).toBe('user');
    expect(billingRoutes['billing/subscription/resume'].auth).toBe('user');
    expect(billingRoutes['billing/subscription/update'].auth).toBe('user');
    expect(billingRoutes['billing/invoices'].auth).toBe('user');
    expect(billingRoutes['billing/payment-methods'].auth).toBe('user');
    expect(billingRoutes['billing/payment-methods/add'].auth).toBe('user');
    expect(billingRoutes['billing/setup-intent'].auth).toBe('user');
  });

  it('should have handler functions for all routes', () => {
    Object.entries(billingRoutes).forEach(([_path, definition]) => {
      expect(definition.handler).toBeDefined();
      expect(typeof definition.handler).toBe('function');
    });
  });
});

// ============================================================================
// Public Route Tests
// ============================================================================

describe('billing/plans - Public Route', () => {
  let mockContext: AppContext;

  beforeEach(() => {
    vi.clearAllMocks();
    mockContext = createMockContext();
  });

  it('should call handleListPlans with context', async () => {
    const mockResult: RouteResult<{ plans: unknown[] }> = {
      status: 200,
      body: { plans: [] },
    };
    (handlers.handleListPlans as Mock).mockResolvedValue(mockResult);

    const route = billingRoutes['billing/plans'];
    const request = createMockPublicRequest();

    const result = await route.handler(mockContext, undefined, request as never, {} as never);

    expect(handlers.handleListPlans).toHaveBeenCalledTimes(1);
    expect(handlers.handleListPlans).toHaveBeenCalledWith(mockContext);
    expect(result).toEqual(mockResult);
  });

  it('should handle errors from handleListPlans', async () => {
    const mockError: RouteResult<{ message: string }> = {
      status: 500,
      body: { message: 'Internal server error' },
    };
    (handlers.handleListPlans as Mock).mockResolvedValue(mockError);

    const route = billingRoutes['billing/plans'];
    const request = createMockPublicRequest();

    const result = await route.handler(mockContext, undefined, request as never, {} as never);

    expect(result.status).toBe(500);
    expect(result.body).toEqual({ message: 'Internal server error' });
  });
});

// ============================================================================
// Protected Route Tests - Subscription
// ============================================================================

describe('billing/subscription - Protected Route', () => {
  let mockContext: AppContext;

  beforeEach(() => {
    vi.clearAllMocks();
    mockContext = createMockContext();
  });

  it('should call handleGetSubscription with context and request', async () => {
    const mockResult: RouteResult<{ subscription: unknown }> = {
      status: 200,
      body: { subscription: {} },
    };
    (handlers.handleGetSubscription as Mock).mockResolvedValue(mockResult);

    const route = billingRoutes['billing/subscription'];
    const request = createMockRequest();

    const result = await route.handler(mockContext, undefined, request as never, {} as never);

    expect(handlers.handleGetSubscription).toHaveBeenCalledTimes(1);
    expect(handlers.handleGetSubscription).toHaveBeenCalledWith(mockContext, request);
    expect(result).toEqual(mockResult);
  });

  it('should handle subscription not found', async () => {
    const mockResult: RouteResult<{ message: string }> = {
      status: 404,
      body: { message: 'Subscription not found' },
    };
    (handlers.handleGetSubscription as Mock).mockResolvedValue(mockResult);

    const route = billingRoutes['billing/subscription'];
    const request = createMockRequest();

    const result = await route.handler(mockContext, undefined, request as never, {} as never);

    expect(result.status).toBe(404);
    expect(result.body).toEqual({ message: 'Subscription not found' });
  });
});

// ============================================================================
// Protected Route Tests - Checkout
// ============================================================================

describe('billing/checkout - Protected Route', () => {
  let mockContext: AppContext;

  beforeEach(() => {
    vi.clearAllMocks();
    mockContext = createMockContext();
  });

  it('should call handleCreateCheckout with context, body, and request', async () => {
    const checkoutRequest = {
      planId: 'plan_123',
      provider: 'stripe' as const,
      successUrl: 'https://example.com/success',
      cancelUrl: 'https://example.com/cancel',
    };

    const mockResult: RouteResult<{ sessionUrl: string }> = {
      status: 200,
      body: { sessionUrl: 'https://checkout.stripe.com/session' },
    };
    (handlers.handleCreateCheckout as Mock).mockResolvedValue(mockResult);

    const route = billingRoutes['billing/checkout'];
    const request = createMockRequest();

    const result = await route.handler(mockContext, checkoutRequest, request as never, {} as never);

    expect(handlers.handleCreateCheckout).toHaveBeenCalledTimes(1);
    expect(handlers.handleCreateCheckout).toHaveBeenCalledWith(mockContext, checkoutRequest, request);
    expect(result).toEqual(mockResult);
  });

  it('should handle invalid plan error', async () => {
    const checkoutRequest = {
      planId: 'invalid_plan',
      provider: 'stripe' as const,
      successUrl: 'https://example.com/success',
      cancelUrl: 'https://example.com/cancel',
    };

    const mockResult: RouteResult<{ message: string }> = {
      status: 404,
      body: { message: 'Plan not found' },
    };
    (handlers.handleCreateCheckout as Mock).mockResolvedValue(mockResult);

    const route = billingRoutes['billing/checkout'];
    const request = createMockRequest();

    const result = await route.handler(mockContext, checkoutRequest, request as never, {} as never);

    expect(result.status).toBe(404);
    expect(result.body).toEqual({ message: 'Plan not found' });
  });
});

// ============================================================================
// Protected Route Tests - Cancel Subscription
// ============================================================================

describe('billing/subscription/cancel - Protected Route', () => {
  let mockContext: AppContext;

  beforeEach(() => {
    vi.clearAllMocks();
    mockContext = createMockContext();
  });

  it('should call handleCancelSubscription with context, body, and request', async () => {
    const cancelRequest = {
      reason: 'Too expensive',
    };

    const mockResult: RouteResult<{ success: boolean; message: string }> = {
      status: 200,
      body: { success: true, message: 'Subscription canceled' },
    };
    (handlers.handleCancelSubscription as Mock).mockResolvedValue(mockResult);

    const route = billingRoutes['billing/subscription/cancel'];
    const request = createMockRequest();

    const result = await route.handler(mockContext, cancelRequest, request as never, {} as never);

    expect(handlers.handleCancelSubscription).toHaveBeenCalledTimes(1);
    expect(handlers.handleCancelSubscription).toHaveBeenCalledWith(mockContext, cancelRequest, request);
    expect(result).toEqual(mockResult);
  });

  it('should handle already canceled subscription', async () => {
    const cancelRequest = {
      reason: 'No longer needed',
    };

    const mockResult: RouteResult<{ message: string }> = {
      status: 400,
      body: { message: 'Subscription already canceled' },
    };
    (handlers.handleCancelSubscription as Mock).mockResolvedValue(mockResult);

    const route = billingRoutes['billing/subscription/cancel'];
    const request = createMockRequest();

    const result = await route.handler(mockContext, cancelRequest, request as never, {} as never);

    expect(result.status).toBe(400);
    expect(result.body).toEqual({ message: 'Subscription already canceled' });
  });
});

// ============================================================================
// Protected Route Tests - Resume Subscription
// ============================================================================

describe('billing/subscription/resume - Protected Route', () => {
  let mockContext: AppContext;

  beforeEach(() => {
    vi.clearAllMocks();
    mockContext = createMockContext();
  });

  it('should call handleResumeSubscription with context and request', async () => {
    const mockResult: RouteResult<{ success: boolean; message: string }> = {
      status: 200,
      body: { success: true, message: 'Subscription resumed' },
    };
    (handlers.handleResumeSubscription as Mock).mockResolvedValue(mockResult);

    const route = billingRoutes['billing/subscription/resume'];
    const request = createMockRequest();

    const result = await route.handler(mockContext, {}, request as never, {} as never);

    expect(handlers.handleResumeSubscription).toHaveBeenCalledTimes(1);
    expect(handlers.handleResumeSubscription).toHaveBeenCalledWith(mockContext, request);
    expect(result).toEqual(mockResult);
  });

  it('should handle subscription not in canceling state', async () => {
    const mockResult: RouteResult<{ message: string }> = {
      status: 400,
      body: { message: 'Subscription is not in canceling state' },
    };
    (handlers.handleResumeSubscription as Mock).mockResolvedValue(mockResult);

    const route = billingRoutes['billing/subscription/resume'];
    const request = createMockRequest();

    const result = await route.handler(mockContext, {}, request as never, {} as never);

    expect(result.status).toBe(400);
    expect(result.body).toEqual({ message: 'Subscription is not in canceling state' });
  });
});

// ============================================================================
// Protected Route Tests - Update Subscription
// ============================================================================

describe('billing/subscription/update - Protected Route', () => {
  let mockContext: AppContext;

  beforeEach(() => {
    vi.clearAllMocks();
    mockContext = createMockContext();
  });

  it('should call handleUpdateSubscription with context, body, and request', async () => {
    const updateRequest = {
      planId: 'plan_456',
    };

    const mockResult: RouteResult<{ success: boolean; message: string }> = {
      status: 200,
      body: { success: true, message: 'Subscription updated' },
    };
    (handlers.handleUpdateSubscription as Mock).mockResolvedValue(mockResult);

    const route = billingRoutes['billing/subscription/update'];
    const request = createMockRequest();

    const result = await route.handler(mockContext, updateRequest, request as never, {} as never);

    expect(handlers.handleUpdateSubscription).toHaveBeenCalledTimes(1);
    expect(handlers.handleUpdateSubscription).toHaveBeenCalledWith(mockContext, updateRequest, request);
    expect(result).toEqual(mockResult);
  });

  it('should handle invalid plan for update', async () => {
    const updateRequest = {
      planId: 'invalid_plan',
    };

    const mockResult: RouteResult<{ message: string }> = {
      status: 404,
      body: { message: 'Plan not found' },
    };
    (handlers.handleUpdateSubscription as Mock).mockResolvedValue(mockResult);

    const route = billingRoutes['billing/subscription/update'];
    const request = createMockRequest();

    const result = await route.handler(mockContext, updateRequest, request as never, {} as never);

    expect(result.status).toBe(404);
    expect(result.body).toEqual({ message: 'Plan not found' });
  });
});

// ============================================================================
// Protected Route Tests - Invoices
// ============================================================================

describe('billing/invoices - Protected Route', () => {
  let mockContext: AppContext;

  beforeEach(() => {
    vi.clearAllMocks();
    mockContext = createMockContext();
  });

  it('should call handleListInvoices with context and request', async () => {
    const mockResult: RouteResult<{ invoices: unknown[] }> = {
      status: 200,
      body: { invoices: [] },
    };
    (handlers.handleListInvoices as Mock).mockResolvedValue(mockResult);

    const route = billingRoutes['billing/invoices'];
    const request = createMockRequest();

    const result = await route.handler(mockContext, undefined, request as never, {} as never);

    expect(handlers.handleListInvoices).toHaveBeenCalledTimes(1);
    expect(handlers.handleListInvoices).toHaveBeenCalledWith(mockContext, request);
    expect(result).toEqual(mockResult);
  });

  it('should handle empty invoices list', async () => {
    const mockResult: RouteResult<{ invoices: unknown[] }> = {
      status: 200,
      body: { invoices: [] },
    };
    (handlers.handleListInvoices as Mock).mockResolvedValue(mockResult);

    const route = billingRoutes['billing/invoices'];
    const request = createMockRequest();

    const result = await route.handler(mockContext, undefined, request as never, {} as never);

    expect(result.status).toBe(200);
    expect(result.body).toEqual({ invoices: [] });
  });
});

// ============================================================================
// Protected Route Tests - Payment Methods
// ============================================================================

describe('billing/payment-methods - Protected Route', () => {
  let mockContext: AppContext;

  beforeEach(() => {
    vi.clearAllMocks();
    mockContext = createMockContext();
  });

  it('should call handleListPaymentMethods with context and request', async () => {
    const mockResult: RouteResult<{ paymentMethods: unknown[] }> = {
      status: 200,
      body: { paymentMethods: [] },
    };
    (handlers.handleListPaymentMethods as Mock).mockResolvedValue(mockResult);

    const route = billingRoutes['billing/payment-methods'];
    const request = createMockRequest();

    const result = await route.handler(mockContext, undefined, request as never, {} as never);

    expect(handlers.handleListPaymentMethods).toHaveBeenCalledTimes(1);
    expect(handlers.handleListPaymentMethods).toHaveBeenCalledWith(mockContext, request);
    expect(result).toEqual(mockResult);
  });

  it('should handle empty payment methods list', async () => {
    const mockResult: RouteResult<{ paymentMethods: unknown[] }> = {
      status: 200,
      body: { paymentMethods: [] },
    };
    (handlers.handleListPaymentMethods as Mock).mockResolvedValue(mockResult);

    const route = billingRoutes['billing/payment-methods'];
    const request = createMockRequest();

    const result = await route.handler(mockContext, undefined, request as never, {} as never);

    expect(result.status).toBe(200);
    expect(result.body).toEqual({ paymentMethods: [] });
  });
});

// ============================================================================
// Protected Route Tests - Add Payment Method
// ============================================================================

describe('billing/payment-methods/add - Protected Route', () => {
  let mockContext: AppContext;

  beforeEach(() => {
    vi.clearAllMocks();
    mockContext = createMockContext();
  });

  it('should call handleAddPaymentMethod with context, body, and request', async () => {
    const addPaymentMethodRequest = {
      paymentMethodId: 'pm_123',
      setAsDefault: true,
    };

    const mockResult: RouteResult<{ paymentMethod: unknown }> = {
      status: 200,
      body: { paymentMethod: {} },
    };
    (handlers.handleAddPaymentMethod as Mock).mockResolvedValue(mockResult);

    const route = billingRoutes['billing/payment-methods/add'];
    const request = createMockRequest();

    const result = await route.handler(mockContext, addPaymentMethodRequest, request as never, {} as never);

    expect(handlers.handleAddPaymentMethod).toHaveBeenCalledTimes(1);
    expect(handlers.handleAddPaymentMethod).toHaveBeenCalledWith(mockContext, addPaymentMethodRequest, request);
    expect(result).toEqual(mockResult);
  });

  it('should handle invalid payment method', async () => {
    const addPaymentMethodRequest = {
      paymentMethodId: 'invalid_pm',
      setAsDefault: false,
    };

    const mockResult: RouteResult<{ message: string }> = {
      status: 400,
      body: { message: 'Invalid payment method' },
    };
    (handlers.handleAddPaymentMethod as Mock).mockResolvedValue(mockResult);

    const route = billingRoutes['billing/payment-methods/add'];
    const request = createMockRequest();

    const result = await route.handler(mockContext, addPaymentMethodRequest, request as never, {} as never);

    expect(result.status).toBe(400);
    expect(result.body).toEqual({ message: 'Invalid payment method' });
  });
});

// ============================================================================
// Protected Route Tests - Setup Intent
// ============================================================================

describe('billing/setup-intent - Protected Route', () => {
  let mockContext: AppContext;

  beforeEach(() => {
    vi.clearAllMocks();
    mockContext = createMockContext();
  });

  it('should call handleCreateSetupIntent with context and request', async () => {
    const mockResult: RouteResult<{ clientSecret: string }> = {
      status: 200,
      body: { clientSecret: 'seti_123_secret' },
    };
    (handlers.handleCreateSetupIntent as Mock).mockResolvedValue(mockResult);

    const route = billingRoutes['billing/setup-intent'];
    const request = createMockRequest();

    const result = await route.handler(mockContext, {}, request as never, {} as never);

    expect(handlers.handleCreateSetupIntent).toHaveBeenCalledTimes(1);
    expect(handlers.handleCreateSetupIntent).toHaveBeenCalledWith(mockContext, request);
    expect(result).toEqual(mockResult);
  });

  it('should handle setup intent creation failure', async () => {
    const mockResult: RouteResult<{ message: string }> = {
      status: 500,
      body: { message: 'Failed to create setup intent' },
    };
    (handlers.handleCreateSetupIntent as Mock).mockResolvedValue(mockResult);

    const route = billingRoutes['billing/setup-intent'];
    const request = createMockRequest();

    const result = await route.handler(mockContext, {}, request as never, {} as never);

    expect(result.status).toBe(500);
    expect(result.body).toEqual({ message: 'Failed to create setup intent' });
  });
});

// ============================================================================
// Edge Cases
// ============================================================================

describe('billingRoutes - Edge Cases', () => {
  let mockContext: AppContext;

  beforeEach(() => {
    vi.clearAllMocks();
    mockContext = createMockContext();
  });

  it('should handle handler throwing error', async () => {
    const error = new Error('Unexpected error');
    (handlers.handleListPlans as Mock).mockRejectedValue(error);

    const route = billingRoutes['billing/plans'];
    const request = createMockPublicRequest();

    await expect(
      route.handler(mockContext, undefined, request as never, {} as never)
    ).rejects.toThrow('Unexpected error');
  });

  it('should pass undefined body for GET routes', async () => {
    const mockResult: RouteResult<{ plans: unknown[] }> = {
      status: 200,
      body: { plans: [] },
    };
    (handlers.handleListPlans as Mock).mockResolvedValue(mockResult);

    const route = billingRoutes['billing/plans'];
    const request = createMockPublicRequest();

    await route.handler(mockContext, undefined, request as never, {} as never);

    // Verify undefined body is passed
    expect(handlers.handleListPlans).toHaveBeenCalledWith(mockContext);
    expect(handlers.handleListPlans).not.toHaveBeenCalledWith(mockContext, expect.anything());
  });

  it('should handle multiple users accessing protected routes', async () => {
    const mockResult1: RouteResult<{ subscription: unknown }> = {
      status: 200,
      body: { subscription: { id: 'sub_1' } },
    };
    const mockResult2: RouteResult<{ subscription: unknown }> = {
      status: 200,
      body: { subscription: { id: 'sub_2' } },
    };

    (handlers.handleGetSubscription as Mock)
      .mockResolvedValueOnce(mockResult1)
      .mockResolvedValueOnce(mockResult2);

    const route = billingRoutes['billing/subscription'];
    const request1 = createMockRequest('user_1');
    const request2 = createMockRequest('user_2');

    const result1 = await route.handler(mockContext, undefined, request1 as never, {} as never);
    const result2 = await route.handler(mockContext, undefined, request2 as never, {} as never);

    expect(result1.body).toEqual({ subscription: { id: 'sub_1' } });
    expect(result2.body).toEqual({ subscription: { id: 'sub_2' } });
    expect(handlers.handleGetSubscription).toHaveBeenCalledTimes(2);
  });
});

// ============================================================================
// Integration Tests
// ============================================================================

describe('billingRoutes - Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should maintain consistent route structure across all routes', () => {
    Object.entries(billingRoutes).forEach(([path, definition]) => {
      expect(definition).toHaveProperty('method');
      expect(definition).toHaveProperty('handler');
      expect(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']).toContain(definition.method);

      if (path !== 'billing/plans') {
        expect(definition.auth).toBe('user');
      }
    });
  });

  it('should have GET routes without body parameters', () => {
    const getRoutes = Object.entries(billingRoutes)
      .filter(([, def]) => def.method === 'GET');

    expect(getRoutes).toHaveLength(4);
    expect(getRoutes.map(([path]) => path)).toContain('billing/plans');
    expect(getRoutes.map(([path]) => path)).toContain('billing/subscription');
    expect(getRoutes.map(([path]) => path)).toContain('billing/invoices');
    expect(getRoutes.map(([path]) => path)).toContain('billing/payment-methods');
  });

  it('should have POST routes for all mutation operations', () => {
    const postRoutes = Object.entries(billingRoutes)
      .filter(([, def]) => def.method === 'POST')
      .map(([path]) => path);

    expect(postRoutes).toContain('billing/checkout');
    expect(postRoutes).toContain('billing/subscription/cancel');
    expect(postRoutes).toContain('billing/subscription/resume');
    expect(postRoutes).toContain('billing/subscription/update');
    expect(postRoutes).toContain('billing/payment-methods/add');
    expect(postRoutes).toContain('billing/setup-intent');
  });

  it('should group subscription-related routes under billing/subscription namespace', () => {
    const subscriptionRoutes = Object.keys(billingRoutes)
      .filter(path => path.startsWith('billing/subscription'));

    expect(subscriptionRoutes).toHaveLength(4);
    expect(subscriptionRoutes).toContain('billing/subscription');
    expect(subscriptionRoutes).toContain('billing/subscription/cancel');
    expect(subscriptionRoutes).toContain('billing/subscription/resume');
    expect(subscriptionRoutes).toContain('billing/subscription/update');
  });

  it('should group payment-method-related routes under billing/payment-methods namespace', () => {
    const paymentMethodRoutes = Object.keys(billingRoutes)
      .filter(path => path.startsWith('billing/payment-methods'));

    expect(paymentMethodRoutes).toHaveLength(2);
    expect(paymentMethodRoutes).toContain('billing/payment-methods');
    expect(paymentMethodRoutes).toContain('billing/payment-methods/add');
  });
});
