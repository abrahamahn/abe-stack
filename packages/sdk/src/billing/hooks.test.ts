// packages/sdk/src/billing/hooks.test.ts
/**
 * Billing Hooks Tests
 *
 * Comprehensive tests for React hooks that manage billing state.
 * Tests cover plans, subscriptions, invoices, and payment methods.
 *
 * @vitest-environment jsdom
 */

import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  billingQueryKeys,
  useInvoices,
  usePaymentMethods,
  usePlans,
  useSubscription,
} from './hooks';

import type {
  Invoice,
  PaymentMethod,
  Plan,
  Subscription,
} from '@abe-stack/core';

// ============================================================================
// Test Data Factories
// ============================================================================

const createMockPlan = (overrides?: Partial<Plan>): Plan => ({
  id: 'plan-123',
  name: 'Pro Plan',
  description: 'Professional features',
  interval: 'month',
  priceInCents: 1999,
  currency: 'usd',
  features: [
    { name: 'Feature 1', included: true },
    { name: 'Feature 2', included: true },
  ],
  trialDays: 14,
  isActive: true,
  sortOrder: 1,
  ...overrides,
});

const createMockSubscription = (overrides?: Partial<Subscription>): Subscription => ({
  id: 'sub-123',
  userId: 'user-123',
  planId: 'plan-123',
  plan: createMockPlan(),
  provider: 'stripe',
  status: 'active',
  currentPeriodStart: '2026-01-01T00:00:00.000Z',
  currentPeriodEnd: '2026-02-01T00:00:00.000Z',
  cancelAtPeriodEnd: false,
  canceledAt: null,
  trialEnd: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  ...overrides,
});

const createMockInvoice = (overrides?: Partial<Invoice>): Invoice => ({
  id: 'inv-123',
  status: 'paid',
  amountDue: 1999,
  amountPaid: 1999,
  currency: 'usd',
  periodStart: '2026-01-01T00:00:00.000Z',
  periodEnd: '2026-02-01T00:00:00.000Z',
  paidAt: '2026-01-01T00:00:00.000Z',
  invoicePdfUrl: 'https://example.com/invoice.pdf',
  createdAt: '2026-01-01T00:00:00.000Z',
  ...overrides,
});

const createMockPaymentMethod = (overrides?: Partial<PaymentMethod>): PaymentMethod => ({
  id: 'pm-123',
  type: 'card',
  isDefault: true,
  cardDetails: {
    brand: 'visa',
    last4: '4242',
    expMonth: 12,
    expYear: 2028,
  },
  createdAt: '2026-01-01T00:00:00.000Z',
  ...overrides,
});

// ============================================================================
// Mock Billing Client
// ============================================================================

const mockListPlans = vi.fn();
const mockGetSubscription = vi.fn();
const mockCreateCheckout = vi.fn();
const mockCancelSubscription = vi.fn();
const mockResumeSubscription = vi.fn();
const mockUpdateSubscription = vi.fn();
const mockListInvoices = vi.fn();
const mockListPaymentMethods = vi.fn();
const mockCreateSetupIntent = vi.fn();
const mockAddPaymentMethod = vi.fn();
const mockRemovePaymentMethod = vi.fn();
const mockSetDefaultPaymentMethod = vi.fn();

vi.mock('./client', () => ({
  createBillingClient: vi.fn(() => ({
    listPlans: mockListPlans,
    getSubscription: mockGetSubscription,
    createCheckout: mockCreateCheckout,
    cancelSubscription: mockCancelSubscription,
    resumeSubscription: mockResumeSubscription,
    updateSubscription: mockUpdateSubscription,
    listInvoices: mockListInvoices,
    listPaymentMethods: mockListPaymentMethods,
    createSetupIntent: mockCreateSetupIntent,
    addPaymentMethod: mockAddPaymentMethod,
    removePaymentMethod: mockRemovePaymentMethod,
    setDefaultPaymentMethod: mockSetDefaultPaymentMethod,
  })),
}));

// ============================================================================
// billingQueryKeys
// ============================================================================

describe('billingQueryKeys', () => {
  it('should generate correct base key', () => {
    expect(billingQueryKeys.all).toEqual(['billing']);
  });

  it('should generate correct plans key', () => {
    expect(billingQueryKeys.plans()).toEqual(['billing', 'plans']);
  });

  it('should generate correct subscription key', () => {
    expect(billingQueryKeys.subscription()).toEqual(['billing', 'subscription']);
  });

  it('should generate correct invoices key', () => {
    expect(billingQueryKeys.invoices()).toEqual(['billing', 'invoices']);
  });

  it('should generate correct payment methods key', () => {
    expect(billingQueryKeys.paymentMethods()).toEqual(['billing', 'payment-methods']);
  });
});

// ============================================================================
// usePlans
// ============================================================================

describe('usePlans', () => {
  const clientConfig = {
    baseUrl: 'http://localhost:3001',
    getToken: () => 'test-token',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Setup default successful responses
    mockListPlans.mockResolvedValue({
      plans: [createMockPlan(), createMockPlan({ id: 'plan-456', name: 'Enterprise' })],
    });
  });

  describe('initial state', () => {
    it('should start with loading state', () => {
      const { result } = renderHook(() => usePlans(clientConfig));

      expect(result.current.isLoading).toBe(true);
      expect(result.current.plans).toEqual([]);
      expect(result.current.error).toBeNull();
    });
  });

  describe('successful fetch', () => {
    it('should fetch plans on mount', async () => {
      const { result } = renderHook(() => usePlans(clientConfig));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.plans).toHaveLength(2);
      expect(result.current.plans[0].id).toBe('plan-123');
      expect(result.current.plans[0].name).toBe('Pro Plan');
      expect(result.current.error).toBeNull();
    });

    it('should provide refresh function', async () => {
      const { result } = renderHook(() => usePlans(clientConfig));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.refresh();
      });

      expect(result.current.plans).toHaveLength(2);
    });
  });

  describe('error handling', () => {
    it('should handle fetch errors', async () => {
      mockListPlans.mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() => usePlans(clientConfig));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBeInstanceOf(Error);
      expect(result.current.error?.message).toBe('Network error');
      expect(result.current.plans).toEqual([]);
    });

    it('should handle non-Error rejections', async () => {
      mockListPlans.mockRejectedValueOnce('String error');

      const { result } = renderHook(() => usePlans(clientConfig));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBeInstanceOf(Error);
      expect(result.current.error?.message).toBe('Failed to fetch plans');
    });

    it('should clear error on successful refresh', async () => {
      // First call fails
      mockListPlans.mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() => usePlans(clientConfig));

      await waitFor(() => {
        expect(result.current.error).not.toBeNull();
      });

      // Second call succeeds
      mockListPlans.mockResolvedValueOnce({
        plans: [createMockPlan()],
      });

      await act(async () => {
        await result.current.refresh();
      });

      await waitFor(() => {
        expect(result.current.error).toBeNull();
      });

      expect(result.current.plans).toHaveLength(1);
    });
  });

  describe('client configuration changes', () => {
    it('should recreate client when config changes', async () => {
      const { result, rerender } = renderHook(
        ({ config }) => usePlans(config),
        {
          initialProps: { config: clientConfig },
        },
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const newConfig = { baseUrl: 'http://localhost:3002', getToken: () => 'new-token' };
      rerender({ config: newConfig });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });
  });
});

// ============================================================================
// useSubscription
// ============================================================================

describe('useSubscription', () => {
  const clientConfig = {
    baseUrl: 'http://localhost:3001',
    getToken: () => 'test-token',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Setup default successful responses
    mockGetSubscription.mockResolvedValue({
      subscription: createMockSubscription(),
    });
    mockCreateCheckout.mockResolvedValue({
      sessionId: 'session-123',
      url: 'https://checkout.example.com/session-123',
    });
    mockCancelSubscription.mockResolvedValue({
      success: true,
      message: 'Subscription canceled',
    });
    mockResumeSubscription.mockResolvedValue({
      success: true,
      message: 'Subscription resumed',
    });
    mockUpdateSubscription.mockResolvedValue({
      success: true,
      message: 'Subscription updated',
    });
  });

  describe('initial state', () => {
    it('should start with loading state', () => {
      const { result } = renderHook(() => useSubscription(clientConfig));

      expect(result.current.isLoading).toBe(true);
      expect(result.current.isActing).toBe(false);
      expect(result.current.subscription).toBeNull();
      expect(result.current.error).toBeNull();
    });
  });

  describe('successful fetch', () => {
    it('should fetch subscription on mount', async () => {
      const { result } = renderHook(() => useSubscription(clientConfig));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.subscription).not.toBeNull();
      expect(result.current.subscription?.id).toBe('sub-123');
      expect(result.current.subscription?.status).toBe('active');
      expect(result.current.error).toBeNull();
    });

    it('should handle null subscription response', async () => {
      mockGetSubscription.mockResolvedValueOnce({ subscription: null });

      const { result } = renderHook(() => useSubscription(clientConfig));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.subscription).toBeNull();
      expect(result.current.error).toBeNull();
    });
  });

  describe('createCheckout action', () => {
    it('should create checkout session', async () => {
      const { result } = renderHook(() => useSubscription(clientConfig));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let checkoutUrl: string = '';
      await act(async () => {
        checkoutUrl = await result.current.createCheckout({ planId: 'plan-123' });
      });

      expect(checkoutUrl).toBe('https://checkout.example.com/session-123');
      expect(result.current.error).toBeNull();
    });

    it('should handle checkout creation errors', async () => {
      mockGetSubscription.mockResolvedValueOnce({ subscription: null });
      mockCreateCheckout.mockRejectedValueOnce(new Error('Payment error'));

      const { result } = renderHook(() => useSubscription(clientConfig));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let thrownError: Error | null = null;
      await act(async () => {
        try {
          await result.current.createCheckout({ planId: 'plan-123' });
        } catch (error) {
          thrownError = error as Error;
        }
      });

      expect(thrownError).toBeInstanceOf(Error);
      expect(thrownError?.message).toBe('Payment error');
      expect(result.current.error).toBeInstanceOf(Error);
      expect(result.current.error?.message).toBe('Payment error');
    });
  });

  describe('cancel action', () => {
    it('should cancel subscription at period end by default', async () => {
      const { result } = renderHook(() => useSubscription(clientConfig));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.cancel();
      });

      await waitFor(() => {
        expect(result.current.error).toBeNull();
      });
    });

    it('should cancel subscription immediately when requested', async () => {
      const { result } = renderHook(() => useSubscription(clientConfig));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.cancel(true);
      });

      await waitFor(() => {
        expect(result.current.error).toBeNull();
      });
    });

    it('should refresh subscription after cancellation', async () => {
      mockGetSubscription
        .mockResolvedValueOnce({ subscription: createMockSubscription() })
        .mockResolvedValueOnce({
          subscription: createMockSubscription({ cancelAtPeriodEnd: true }),
        });

      const { result } = renderHook(() => useSubscription(clientConfig));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.cancel();
      });

      await waitFor(() => {
        expect(mockGetSubscription).toHaveBeenCalledTimes(2);
      });
    });

    it('should handle cancellation errors', async () => {
      mockCancelSubscription.mockRejectedValueOnce(new Error('Cancellation failed'));

      const { result } = renderHook(() => useSubscription(clientConfig));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let thrownError: Error | null = null;
      await act(async () => {
        try {
          await result.current.cancel();
        } catch (error) {
          thrownError = error as Error;
        }
      });

      expect(thrownError).toBeInstanceOf(Error);
      expect(thrownError?.message).toBe('Cancellation failed');
      expect(result.current.error).toBeInstanceOf(Error);
      expect(result.current.error?.message).toBe('Cancellation failed');
    });
  });

  describe('resume action', () => {
    it('should resume canceled subscription', async () => {
      const { result } = renderHook(() => useSubscription(clientConfig));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.resume();
      });

      await waitFor(() => {
        expect(result.current.error).toBeNull();
      });
    });

    it('should refresh subscription after resume', async () => {
      mockGetSubscription
        .mockResolvedValueOnce({
          subscription: createMockSubscription({ cancelAtPeriodEnd: true }),
        })
        .mockResolvedValueOnce({
          subscription: createMockSubscription({ cancelAtPeriodEnd: false }),
        });

      const { result } = renderHook(() => useSubscription(clientConfig));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.resume();
      });

      await waitFor(() => {
        expect(mockGetSubscription).toHaveBeenCalledTimes(2);
      });
    });

    it('should handle resume errors', async () => {
      mockResumeSubscription.mockRejectedValueOnce(new Error('Resume failed'));

      const { result } = renderHook(() => useSubscription(clientConfig));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let thrownError: Error | null = null;
      await act(async () => {
        try {
          await result.current.resume();
        } catch (error) {
          thrownError = error as Error;
        }
      });

      expect(thrownError).toBeInstanceOf(Error);
      expect(thrownError?.message).toBe('Resume failed');
      expect(result.current.error).toBeInstanceOf(Error);
      expect(result.current.error?.message).toBe('Resume failed');
    });
  });

  describe('changePlan action', () => {
    it('should change subscription plan', async () => {
      const { result } = renderHook(() => useSubscription(clientConfig));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.changePlan('plan-456');
      });

      await waitFor(() => {
        expect(result.current.error).toBeNull();
      });
    });

    it('should refresh subscription after plan change', async () => {
      mockGetSubscription
        .mockResolvedValueOnce({ subscription: createMockSubscription() })
        .mockResolvedValueOnce({
          subscription: createMockSubscription({ planId: 'plan-456' }),
        });

      const { result } = renderHook(() => useSubscription(clientConfig));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.changePlan('plan-456');
      });

      await waitFor(() => {
        expect(mockGetSubscription).toHaveBeenCalledTimes(2);
      });
    });

    it('should handle plan change errors', async () => {
      mockUpdateSubscription.mockRejectedValueOnce(new Error('Update failed'));

      const { result } = renderHook(() => useSubscription(clientConfig));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let thrownError: Error | null = null;
      await act(async () => {
        try {
          await result.current.changePlan('plan-456');
        } catch (error) {
          thrownError = error as Error;
        }
      });

      expect(thrownError).toBeInstanceOf(Error);
      expect(thrownError?.message).toBe('Update failed');
      expect(result.current.error).toBeInstanceOf(Error);
      expect(result.current.error?.message).toBe('Update failed');
    });
  });

  describe('refresh action', () => {
    it('should refresh subscription data', async () => {
      const { result } = renderHook(() => useSubscription(clientConfig));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.refresh();
      });

      await waitFor(() => {
        expect(result.current.subscription).not.toBeNull();
        expect(result.current.error).toBeNull();
      });
    });
  });

  describe('error handling for non-Error types', () => {
    it('should convert non-Error rejections to Error objects', async () => {
      mockGetSubscription.mockResolvedValueOnce({ subscription: null });
      mockCreateCheckout.mockRejectedValueOnce('String error');

      const { result } = renderHook(() => useSubscription(clientConfig));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await expect(
        act(async () => {
          await result.current.createCheckout({ planId: 'plan-123' });
        }),
      ).rejects.toThrow('Failed to create checkout');
    });
  });
});

// ============================================================================
// useInvoices
// ============================================================================

describe('useInvoices', () => {
  const clientConfig = {
    baseUrl: 'http://localhost:3001',
    getToken: () => 'test-token',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Setup default successful responses
    mockListInvoices.mockResolvedValue({
      invoices: [createMockInvoice(), createMockInvoice({ id: 'inv-456', status: 'open' })],
      hasMore: false,
    });
  });

  describe('initial state', () => {
    it('should start with loading state', () => {
      const { result } = renderHook(() => useInvoices(clientConfig));

      expect(result.current.isLoading).toBe(true);
      expect(result.current.invoices).toEqual([]);
      expect(result.current.hasMore).toBe(false);
      expect(result.current.error).toBeNull();
    });
  });

  describe('successful fetch', () => {
    it('should fetch invoices on mount', async () => {
      const { result } = renderHook(() => useInvoices(clientConfig));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.invoices).toHaveLength(2);
      expect(result.current.invoices[0].id).toBe('inv-123');
      expect(result.current.invoices[0].status).toBe('paid');
      expect(result.current.hasMore).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should handle hasMore pagination flag', async () => {
      mockListInvoices.mockResolvedValueOnce({
        invoices: [createMockInvoice()],
        hasMore: true,
      });

      const { result } = renderHook(() => useInvoices(clientConfig));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.hasMore).toBe(true);
    });

    it('should provide refresh function', async () => {
      const { result } = renderHook(() => useInvoices(clientConfig));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.refresh();
      });

      await waitFor(() => {
        expect(result.current.invoices).toHaveLength(2);
        expect(result.current.error).toBeNull();
      });
    });
  });

  describe('error handling', () => {
    it('should handle fetch errors', async () => {
      mockListInvoices.mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() => useInvoices(clientConfig));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBeInstanceOf(Error);
      expect(result.current.error?.message).toBe('Network error');
      expect(result.current.invoices).toEqual([]);
    });

    it('should handle non-Error rejections', async () => {
      mockListInvoices.mockRejectedValueOnce('String error');

      const { result } = renderHook(() => useInvoices(clientConfig));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBeInstanceOf(Error);
      expect(result.current.error?.message).toBe('Failed to fetch invoices');
    });

    it('should clear error on successful refresh', async () => {
      // First call fails
      mockListInvoices.mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() => useInvoices(clientConfig));

      await waitFor(() => {
        expect(result.current.error).not.toBeNull();
      });

      // Second call succeeds
      mockListInvoices.mockResolvedValueOnce({
        invoices: [createMockInvoice()],
        hasMore: false,
      });

      await act(async () => {
        await result.current.refresh();
      });

      await waitFor(() => {
        expect(result.current.error).toBeNull();
      });

      expect(result.current.invoices).toHaveLength(1);
    });
  });

  describe('edge cases', () => {
    it('should handle empty invoice list', async () => {
      mockListInvoices.mockResolvedValueOnce({
        invoices: [],
        hasMore: false,
      });

      const { result } = renderHook(() => useInvoices(clientConfig));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.invoices).toEqual([]);
      expect(result.current.hasMore).toBe(false);
      expect(result.current.error).toBeNull();
    });
  });
});

// ============================================================================
// usePaymentMethods
// ============================================================================

describe('usePaymentMethods', () => {
  const clientConfig = {
    baseUrl: 'http://localhost:3001',
    getToken: () => 'test-token',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Setup default successful responses
    mockListPaymentMethods.mockResolvedValue({
      paymentMethods: [
        createMockPaymentMethod(),
        createMockPaymentMethod({ id: 'pm-456', isDefault: false }),
      ],
    });
    mockCreateSetupIntent.mockResolvedValue({
      clientSecret: 'secret-123',
    });
    mockAddPaymentMethod.mockResolvedValue({
      paymentMethod: createMockPaymentMethod({ id: 'pm-new' }),
    });
    mockRemovePaymentMethod.mockResolvedValue({
      success: true,
      message: 'Payment method removed',
    });
    mockSetDefaultPaymentMethod.mockResolvedValue({
      paymentMethod: createMockPaymentMethod(),
    });
  });

  describe('initial state', () => {
    it('should start with loading state', () => {
      const { result } = renderHook(() => usePaymentMethods(clientConfig));

      expect(result.current.isLoading).toBe(true);
      expect(result.current.isActing).toBe(false);
      expect(result.current.paymentMethods).toEqual([]);
      expect(result.current.setupIntentSecret).toBeNull();
      expect(result.current.error).toBeNull();
    });
  });

  describe('successful fetch', () => {
    it('should fetch payment methods on mount', async () => {
      const { result } = renderHook(() => usePaymentMethods(clientConfig));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.paymentMethods).toHaveLength(2);
      expect(result.current.paymentMethods[0].id).toBe('pm-123');
      expect(result.current.paymentMethods[0].isDefault).toBe(true);
      expect(result.current.error).toBeNull();
    });

    it('should handle empty payment methods list', async () => {
      mockListPaymentMethods.mockResolvedValueOnce({ paymentMethods: [] });

      const { result } = renderHook(() => usePaymentMethods(clientConfig));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.paymentMethods).toEqual([]);
      expect(result.current.error).toBeNull();
    });
  });

  describe('getSetupIntent action', () => {
    it('should get setup intent for adding card', async () => {
      const { result } = renderHook(() => usePaymentMethods(clientConfig));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let clientSecret: string = '';
      await act(async () => {
        clientSecret = await result.current.getSetupIntent();
      });

      await waitFor(() => {
        expect(clientSecret).toBe('secret-123');
        expect(result.current.setupIntentSecret).toBe('secret-123');
        expect(result.current.error).toBeNull();
      });
    });

    it('should handle setup intent errors', async () => {
      mockCreateSetupIntent.mockRejectedValueOnce(new Error('Setup failed'));

      const { result } = renderHook(() => usePaymentMethods(clientConfig));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let thrownError: Error | null = null;
      await act(async () => {
        try {
          await result.current.getSetupIntent();
        } catch (error) {
          thrownError = error as Error;
        }
      });

      expect(thrownError).toBeInstanceOf(Error);
      expect(thrownError?.message).toBe('Setup failed');
      expect(result.current.error).toBeInstanceOf(Error);
      expect(result.current.error?.message).toBe('Setup failed');
    });
  });

  describe('addPaymentMethod action', () => {
    it('should add payment method', async () => {
      const { result } = renderHook(() => usePaymentMethods(clientConfig));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // First get setup intent
      await act(async () => {
        await result.current.getSetupIntent();
      });

      await waitFor(() => {
        expect(result.current.setupIntentSecret).toBe('secret-123');
      });

      // Then add payment method
      await act(async () => {
        await result.current.addPaymentMethod('pm-new-stripe-id');
      });

      await waitFor(() => {
        expect(result.current.setupIntentSecret).toBeNull();
        expect(result.current.error).toBeNull();
      });
    });

    it('should refresh payment methods after adding', async () => {
      mockListPaymentMethods
        .mockResolvedValueOnce({ paymentMethods: [createMockPaymentMethod()] })
        .mockResolvedValueOnce({
          paymentMethods: [createMockPaymentMethod(), createMockPaymentMethod({ id: 'pm-new' })],
        });

      const { result } = renderHook(() => usePaymentMethods(clientConfig));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.addPaymentMethod('pm-new-stripe-id');
      });

      await waitFor(() => {
        expect(mockListPaymentMethods).toHaveBeenCalledTimes(2);
      });
    });

    it('should handle add payment method errors', async () => {
      mockAddPaymentMethod.mockRejectedValueOnce(new Error('Add failed'));

      const { result } = renderHook(() => usePaymentMethods(clientConfig));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let thrownError: Error | null = null;
      await act(async () => {
        try {
          await result.current.addPaymentMethod('pm-new-stripe-id');
        } catch (error) {
          thrownError = error as Error;
        }
      });

      expect(thrownError).toBeInstanceOf(Error);
      expect(thrownError?.message).toBe('Add failed');
      expect(result.current.error).toBeInstanceOf(Error);
      expect(result.current.error?.message).toBe('Add failed');
    });
  });

  describe('removePaymentMethod action', () => {
    it('should remove payment method', async () => {
      const { result } = renderHook(() => usePaymentMethods(clientConfig));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.removePaymentMethod('pm-456');
      });

      await waitFor(() => {
        expect(result.current.error).toBeNull();
      });
    });

    it('should refresh payment methods after removal', async () => {
      mockListPaymentMethods
        .mockResolvedValueOnce({
          paymentMethods: [createMockPaymentMethod(), createMockPaymentMethod({ id: 'pm-456' })],
        })
        .mockResolvedValueOnce({
          paymentMethods: [createMockPaymentMethod()],
        });

      const { result } = renderHook(() => usePaymentMethods(clientConfig));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.removePaymentMethod('pm-456');
      });

      await waitFor(() => {
        expect(mockListPaymentMethods).toHaveBeenCalledTimes(2);
      });
    });

    it('should handle remove payment method errors', async () => {
      mockRemovePaymentMethod.mockRejectedValueOnce(new Error('Remove failed'));

      const { result } = renderHook(() => usePaymentMethods(clientConfig));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let thrownError: Error | null = null;
      await act(async () => {
        try {
          await result.current.removePaymentMethod('pm-456');
        } catch (error) {
          thrownError = error as Error;
        }
      });

      expect(thrownError).toBeInstanceOf(Error);
      expect(thrownError?.message).toBe('Remove failed');
      expect(result.current.error).toBeInstanceOf(Error);
      expect(result.current.error?.message).toBe('Remove failed');
    });
  });

  describe('setDefault action', () => {
    it('should set payment method as default', async () => {
      const { result } = renderHook(() => usePaymentMethods(clientConfig));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.setDefault('pm-456');
      });

      await waitFor(() => {
        expect(result.current.error).toBeNull();
      });
    });

    it('should refresh payment methods after setting default', async () => {
      mockListPaymentMethods
        .mockResolvedValueOnce({
          paymentMethods: [
            createMockPaymentMethod(),
            createMockPaymentMethod({ id: 'pm-456', isDefault: false }),
          ],
        })
        .mockResolvedValueOnce({
          paymentMethods: [
            createMockPaymentMethod({ isDefault: false }),
            createMockPaymentMethod({ id: 'pm-456', isDefault: true }),
          ],
        });

      const { result } = renderHook(() => usePaymentMethods(clientConfig));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.setDefault('pm-456');
      });

      await waitFor(() => {
        expect(mockListPaymentMethods).toHaveBeenCalledTimes(2);
      });
    });

    it('should handle set default errors', async () => {
      mockSetDefaultPaymentMethod.mockRejectedValueOnce(new Error('Set default failed'));

      const { result } = renderHook(() => usePaymentMethods(clientConfig));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let thrownError: Error | null = null;
      await act(async () => {
        try {
          await result.current.setDefault('pm-456');
        } catch (error) {
          thrownError = error as Error;
        }
      });

      expect(thrownError).toBeInstanceOf(Error);
      expect(thrownError?.message).toBe('Set default failed');
      expect(result.current.error).toBeInstanceOf(Error);
      expect(result.current.error?.message).toBe('Set default failed');
    });
  });

  describe('refresh action', () => {
    it('should refresh payment methods', async () => {
      const { result } = renderHook(() => usePaymentMethods(clientConfig));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.refresh();
      });

      await waitFor(() => {
        expect(result.current.paymentMethods).toHaveLength(2);
        expect(result.current.error).toBeNull();
      });
    });
  });

  describe('error handling', () => {
    it('should handle fetch errors', async () => {
      mockListPaymentMethods.mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() => usePaymentMethods(clientConfig));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBeInstanceOf(Error);
      expect(result.current.error?.message).toBe('Network error');
      expect(result.current.paymentMethods).toEqual([]);
    });

    it('should handle non-Error rejections', async () => {
      mockListPaymentMethods.mockResolvedValueOnce({ paymentMethods: [] });
      mockCreateSetupIntent.mockRejectedValueOnce('String error');

      const { result } = renderHook(() => usePaymentMethods(clientConfig));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await expect(
        act(async () => {
          await result.current.getSetupIntent();
        }),
      ).rejects.toThrow('Failed to create setup intent');
    });
  });
});
