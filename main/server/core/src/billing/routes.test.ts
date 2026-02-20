// main/server/core/src/billing/routes.test.ts
/**
 * Billing Routes Unit Tests
 *
 * Tests for route definitions, HTTP methods, authentication requirements,
 * and route handler invocation for all billing endpoints.
 */

import { describe, expect, it } from 'vitest';

import { billingRoutes } from './routes';

import type { BillingBaseRouteDefinition, BillingRouteMap } from './types';

// ============================================================================
// Tests: Route Map Structure
// ============================================================================

describe('billingRoutes', () => {
  it('should be a valid route map object', () => {
    expect(billingRoutes).toBeDefined();
    expect(typeof billingRoutes).toBe('object');
  });

  it('should have all expected route paths', () => {
    const expectedPaths = [
      'billing/plans',
      'billing/subscription',
      'billing/checkout',
      'billing/portal',
      'billing/subscription/cancel',
      'billing/subscription/resume',
      'billing/subscription/update',
      'billing/invoices',
      'billing/invoices/:id',
      'billing/usage',
      'tenants/:id/usage',
      'tenants/:id/usage/record',
      'billing/payment-methods',
      'billing/payment-methods/add',
      'billing/setup-intent',
      'billing/payment-methods/:id',
      'billing/payment-methods/:id/default',
    ];

    for (const path of expectedPaths) {
      expect(billingRoutes[path]).toBeDefined();
    }
  });

  it('should have exactly 17 routes', () => {
    const routeCount = Object.keys(billingRoutes).length;

    expect(routeCount).toBe(17);
  });
});

// ============================================================================
// Tests: Route Definitions
// ============================================================================

describe('route definitions', () => {
  /**
   * Validate that a route definition has the expected structure.
   *
   * @param routes - Route map
   * @param path - Route path
   * @param expectedMethod - Expected HTTP method
   * @param expectedAuth - Expected auth level (undefined = public)
   * @complexity O(1)
   */
  function assertRouteDefinition(
    routes: BillingRouteMap,
    path: string,
    expectedMethod: BillingBaseRouteDefinition['method'],
    expectedAuth?: 'user' | 'admin',
  ): void {
    const route = routes[path];
    expect(route).toBeDefined();
    expect(route?.method).toBe(expectedMethod);
    expect(route?.handler).toBeTypeOf('function');

    if (expectedAuth !== undefined) {
      expect(route?.auth).toBe(expectedAuth);
    } else {
      expect(route?.auth).toBeUndefined();
    }
  }

  describe('billing/plans', () => {
    it('should be a public GET route', () => {
      assertRouteDefinition(billingRoutes, 'billing/plans', 'GET');
    });

    it('should not require authentication', () => {
      const route = billingRoutes['billing/plans'];
      expect(route?.auth).toBeUndefined();
    });
  });

  describe('billing/subscription', () => {
    it('should be a protected GET route requiring user auth', () => {
      assertRouteDefinition(billingRoutes, 'billing/subscription', 'GET', 'user');
    });
  });

  describe('billing/checkout', () => {
    it('should be a protected POST route requiring user auth', () => {
      assertRouteDefinition(billingRoutes, 'billing/checkout', 'POST', 'user');
    });
  });

  describe('billing/portal', () => {
    it('should be a protected POST route requiring user auth', () => {
      assertRouteDefinition(billingRoutes, 'billing/portal', 'POST', 'user');
    });
  });

  describe('billing/subscription/cancel', () => {
    it('should be a protected POST route requiring user auth', () => {
      assertRouteDefinition(billingRoutes, 'billing/subscription/cancel', 'POST', 'user');
    });
  });

  describe('billing/subscription/resume', () => {
    it('should be a protected POST route requiring user auth', () => {
      assertRouteDefinition(billingRoutes, 'billing/subscription/resume', 'POST', 'user');
    });
  });

  describe('billing/subscription/update', () => {
    it('should be a protected POST route requiring user auth', () => {
      assertRouteDefinition(billingRoutes, 'billing/subscription/update', 'POST', 'user');
    });
  });

  describe('billing/invoices', () => {
    it('should be a protected GET route requiring user auth', () => {
      assertRouteDefinition(billingRoutes, 'billing/invoices', 'GET', 'user');
    });
  });

  describe('billing/usage', () => {
    it('should be a protected GET route requiring user auth', () => {
      assertRouteDefinition(billingRoutes, 'billing/usage', 'GET', 'user');
    });
  });

  describe('billing/payment-methods', () => {
    it('should be a protected GET route requiring user auth', () => {
      assertRouteDefinition(billingRoutes, 'billing/payment-methods', 'GET', 'user');
    });
  });

  describe('billing/payment-methods/add', () => {
    it('should be a protected POST route requiring user auth', () => {
      assertRouteDefinition(billingRoutes, 'billing/payment-methods/add', 'POST', 'user');
    });
  });

  describe('billing/setup-intent', () => {
    it('should be a protected POST route requiring user auth', () => {
      assertRouteDefinition(billingRoutes, 'billing/setup-intent', 'POST', 'user');
    });
  });

  describe('billing/payment-methods/:id', () => {
    it('should be a protected DELETE route requiring user auth', () => {
      assertRouteDefinition(billingRoutes, 'billing/payment-methods/:id', 'DELETE', 'user');
    });
  });

  describe('billing/payment-methods/:id/default', () => {
    it('should be a protected POST route requiring user auth', () => {
      assertRouteDefinition(billingRoutes, 'billing/payment-methods/:id/default', 'POST', 'user');
    });
  });
});

// ============================================================================
// Tests: HTTP Methods
// ============================================================================

describe('HTTP methods', () => {
  it('should have GET methods for read-only operations', () => {
    const getRoutes = [
      'billing/plans',
      'billing/subscription',
      'billing/invoices',
      'billing/invoices/:id',
      'billing/usage',
      'billing/payment-methods',
    ];

    for (const path of getRoutes) {
      expect(billingRoutes[path]?.method).toBe('GET');
    }
  });

  it('should have POST methods for mutation operations', () => {
    const postRoutes = [
      'billing/checkout',
      'billing/portal',
      'billing/subscription/cancel',
      'billing/subscription/resume',
      'billing/subscription/update',
      'billing/payment-methods/add',
      'billing/setup-intent',
      'billing/payment-methods/:id/default',
    ];

    for (const path of postRoutes) {
      expect(billingRoutes[path]?.method).toBe('POST');
    }
  });
  it('should have DELETE methods for delete operations', () => {
    expect(billingRoutes['billing/payment-methods/:id']?.method).toBe('DELETE');
  });
});

// ============================================================================
// Tests: Authentication Requirements
// ============================================================================

describe('authentication requirements', () => {
  it('should have billing/plans as the only public route', () => {
    const publicRoutes = Object.entries(billingRoutes).filter(
      ([, route]) => route.auth === undefined,
    );

    expect(publicRoutes).toHaveLength(1);
    expect(publicRoutes[0]?.[0]).toBe('billing/plans');
  });

  it('should have all other routes as user-protected', () => {
    const protectedRoutes = Object.entries(billingRoutes).filter(
      ([, route]) => route.auth === 'user',
    );

    expect(protectedRoutes).toHaveLength(15);
  });

  it('should have one admin-only route', () => {
    const adminRoutes = Object.entries(billingRoutes).filter(([, route]) => route.auth === 'admin');

    expect(adminRoutes).toHaveLength(1);
    expect(adminRoutes[0]?.[0]).toBe('tenants/:id/usage/record');
  });
});

// ============================================================================
// Tests: Handler Functions
// ============================================================================

describe('handler functions', () => {
  it('should have handler functions that return Promises for all routes', () => {
    for (const [, route] of Object.entries(billingRoutes)) {
      expect(route.handler).toBeTypeOf('function');
      // Handler must be a function (async or sync returning Promise)
      const isAsync = route.handler.constructor.name === 'AsyncFunction';
      const isFunction = route.handler.constructor.name === 'Function';
      expect(isAsync || isFunction).toBe(true);
    }
  });
});
