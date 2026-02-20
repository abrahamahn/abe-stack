// main/apps/web/src/__tests__/integration/webhook-admin.test.tsx
/**
 * Webhook Admin E2E Integration Test
 *
 * Tests the full admin workflow:
 * 1. Admin navigates to webhook list page
 * 2. Creates a new webhook
 * 3. Triggers an event (simulated via mocked data)
 * 4. Views delivery in the delivery log
 */

import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { WebhookDetailPage } from '../../features/admin/pages/WebhookDetailPage';
import { WebhookListPage } from '../../features/admin/pages/WebhookListPage';

import type { ReactNode } from 'react';

// ============================================================================
// Mock Dependencies
// ============================================================================

// Mock the webhook admin hooks
const mockWebhooks = vi.fn();
const mockRefreshWebhooks = vi.fn().mockResolvedValue(undefined);
const mockCreateWebhook = vi.fn().mockResolvedValue(undefined);
const mockDeleteWebhook = vi.fn().mockResolvedValue(undefined);
const mockWebhookDetail = vi.fn();
const mockRefreshDetail = vi.fn().mockResolvedValue(undefined);
const mockDeliveries = vi.fn();
const mockRefreshDeliveries = vi.fn().mockResolvedValue(undefined);
const mockUpdateWebhook = vi.fn().mockResolvedValue(undefined);
const mockRotateSecret = vi.fn().mockResolvedValue(undefined);
const mockReplayDelivery = vi.fn().mockResolvedValue(undefined);

vi.mock('../../features/admin/hooks/useWebhookAdmin', () => ({
  useAdminWebhooks: () => ({
    webhooks: mockWebhooks(),
    isLoading: false,
    error: null,
    refresh: mockRefreshWebhooks,
  }),
  useAdminCreateWebhook: (options?: { onSuccess?: () => void }) => ({
    create: (data: unknown) => {
      mockCreateWebhook(data);
      options?.onSuccess?.();
    },
    isLoading: false,
    error: null,
  }),
  useAdminDeleteWebhook: (options?: { onSuccess?: () => void }) => ({
    remove: (id: string) => {
      mockDeleteWebhook(id);
      options?.onSuccess?.();
    },
    isLoading: false,
    error: null,
  }),
  useAdminWebhook: (_id: string | null) => ({
    webhook: mockWebhookDetail(),
    isLoading: false,
    error: null,
    refresh: mockRefreshDetail,
  }),
  useAdminWebhookDeliveries: (_webhookId: string | null) => ({
    deliveries: mockDeliveries(),
    isLoading: false,
    error: null,
    refresh: mockRefreshDeliveries,
  }),
  useAdminUpdateWebhook: (options?: { onSuccess?: () => void }) => ({
    update: (id: string, data: unknown) => {
      mockUpdateWebhook(id, data);
      options?.onSuccess?.();
    },
    isLoading: false,
    error: null,
  }),
  useAdminRotateWebhookSecret: (options?: { onSuccess?: () => void }) => ({
    rotate: (id: string) => {
      mockRotateSecret(id);
      options?.onSuccess?.();
    },
    isLoading: false,
    error: null,
    newSecret: null,
  }),
  useAdminReplayDelivery: (options?: { onSuccess?: () => void; webhookId?: string }) => ({
    replay: (deliveryId: string) => {
      mockReplayDelivery(deliveryId);
      options?.onSuccess?.();
    },
    isLoading: false,
    error: null,
  }),
}));

// Mock UI components
vi.mock('@bslt/ui', async () => {
  const actual = await vi.importActual('@bslt/ui');
  return {
    ...actual,
    Alert: ({ children, tone }: { children: ReactNode; tone: string }) => (
      <div data-testid="alert" data-tone={tone}>
        {children}
      </div>
    ),
    Badge: ({ children, tone }: { children: ReactNode; tone: string }) => (
      <span data-testid="badge" data-tone={tone}>
        {children}
      </span>
    ),
    Button: ({
      children,
      onClick,
      disabled,
    }: {
      children: ReactNode;
      onClick?: () => void;
      disabled?: boolean;
    }) => (
      <button onClick={onClick} disabled={disabled}>
        {children}
      </button>
    ),
    Checkbox: ({
      checked,
      onChange,
      label,
    }: {
      checked?: boolean;
      onChange?: () => void;
      label?: string;
    }) => (
      <label>
        <input type="checkbox" checked={checked} onChange={onChange} />
        {label}
      </label>
    ),
    Heading: ({ children }: { children: ReactNode }) => <h2>{children}</h2>,
    Input: ({
      value,
      onChange,
      placeholder,
    }: {
      value?: string;
      onChange?: (e: { target: { value: string } }) => void;
      placeholder?: string;
    }) => <input value={value} onChange={onChange} placeholder={placeholder} />,
    Modal: {
      Root: ({ children, open }: { children: ReactNode; open: boolean }) =>
        open ? <div data-testid="modal">{children}</div> : null,
      Header: ({ children }: { children: ReactNode }) => <div>{children}</div>,
      Title: ({ children }: { children: ReactNode }) => <h3>{children}</h3>,
      Description: ({ children }: { children: ReactNode }) => <p>{children}</p>,
      Body: ({ children }: { children: ReactNode }) => <div>{children}</div>,
      Footer: ({ children }: { children: ReactNode }) => <div>{children}</div>,
    },
    PageContainer: ({ children }: { children: ReactNode }) => <div>{children}</div>,
    Select: ({
      children,
      value,
      onChange,
    }: {
      children: ReactNode;
      value: string;
      onChange: (v: string) => void;
    }) => (
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        {children}
      </select>
    ),
    Skeleton: () => <div data-testid="skeleton" />,
    Switch: ({
      checked,
      onChange,
      disabled,
    }: {
      checked?: boolean;
      onChange?: () => void;
      disabled?: boolean;
    }) => (
      <button
        data-testid="switch"
        role="switch"
        aria-checked={checked}
        onClick={onChange}
        disabled={disabled}
      >
        Toggle
      </button>
    ),
    Table: ({ children }: { children: ReactNode }) => <table>{children}</table>,
    TableBody: ({ children }: { children: ReactNode }) => <tbody>{children}</tbody>,
    TableCell: ({ children }: { children: ReactNode }) => <td>{children}</td>,
    TableHead: ({ children }: { children: ReactNode }) => <th>{children}</th>,
    TableHeader: ({ children }: { children: ReactNode }) => <thead>{children}</thead>,
    TableRow: ({ children }: { children: ReactNode }) => <tr>{children}</tr>,
    Text: ({ children }: { children: ReactNode }) => <span>{children}</span>,
  };
});

// ============================================================================
// Test Data
// ============================================================================

const mockWebhookList = [
  {
    id: 'wh-1',
    tenantId: 'tenant-1',
    url: 'https://example.com/hook',
    events: ['user.created', 'user.deleted'],
    secret: 'whsec_test123',
    isActive: true,
    createdAt: '2026-02-01T10:00:00Z',
    updatedAt: '2026-02-01T10:00:00Z',
  },
  {
    id: 'wh-2',
    tenantId: 'tenant-1',
    url: 'https://example.com/hook2',
    events: ['billing.*'],
    secret: 'whsec_test456',
    isActive: false,
    createdAt: '2026-01-15T10:00:00Z',
    updatedAt: '2026-01-15T10:00:00Z',
  },
];

const mockWebhookDetailData = {
  id: 'wh-1',
  tenantId: 'tenant-1',
  url: 'https://example.com/hook',
  events: ['user.created', 'user.deleted'],
  secret: 'whsec_test123',
  isActive: true,
  createdAt: '2026-02-01T10:00:00Z',
  updatedAt: '2026-02-01T10:00:00Z',
  recentDeliveries: [
    {
      id: 'wd-1',
      eventType: 'user.created',
      status: 'delivered',
      attempts: 1,
      createdAt: '2026-02-10T12:00:00Z',
      deliveredAt: '2026-02-10T12:00:01Z',
    },
    {
      id: 'wd-2',
      eventType: 'user.deleted',
      status: 'failed',
      attempts: 3,
      createdAt: '2026-02-10T14:00:00Z',
      deliveredAt: null,
    },
  ],
};

const mockDeliveriesList = [
  {
    id: 'wd-1',
    eventType: 'user.created',
    status: 'delivered',
    attempts: 1,
    createdAt: '2026-02-10T12:00:00Z',
    deliveredAt: '2026-02-10T12:00:01Z',
  },
  {
    id: 'wd-2',
    eventType: 'user.deleted',
    status: 'failed',
    attempts: 3,
    createdAt: '2026-02-10T14:00:00Z',
    deliveredAt: null,
  },
  {
    id: 'wd-3',
    eventType: 'user.created',
    status: 'dead',
    attempts: 5,
    createdAt: '2026-02-11T09:00:00Z',
    deliveredAt: null,
  },
];

// ============================================================================
// Tests
// ============================================================================

describe('Webhook Admin E2E: admin -> create webhook -> trigger event -> see delivery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // --------------------------------------------------------------------------
  // WebhookListPage Tests
  // --------------------------------------------------------------------------

  describe('WebhookListPage', () => {
    it('should render the webhook list with active and inactive badges', () => {
      mockWebhooks.mockReturnValue(mockWebhookList);

      render(<WebhookListPage />);

      expect(screen.getByText('Webhooks')).toBeInTheDocument();
      expect(screen.getByText('https://example.com/hook')).toBeInTheDocument();
      expect(screen.getByText('https://example.com/hook2')).toBeInTheDocument();
      expect(screen.getByText('Active')).toBeInTheDocument();
      expect(screen.getByText('Inactive')).toBeInTheDocument();
    });

    it('should show empty state when no webhooks', () => {
      mockWebhooks.mockReturnValue([]);

      render(<WebhookListPage />);

      expect(
        screen.getByText('No webhooks configured. Create one to get started.'),
      ).toBeInTheDocument();
    });

    it('should open create dialog when Create Webhook is clicked', () => {
      mockWebhooks.mockReturnValue([]);

      render(<WebhookListPage />);

      fireEvent.click(screen.getByText('Create Webhook'));

      expect(screen.getByText('Create Webhook', { selector: 'h3' })).toBeInTheDocument();
      expect(screen.getByPlaceholderText('https://example.com/webhooks')).toBeInTheDocument();
    });

    it('should call delete when Delete button is clicked', () => {
      mockWebhooks.mockReturnValue([mockWebhookList[0]!]);

      render(<WebhookListPage />);

      fireEvent.click(screen.getByText('Delete'));

      expect(mockDeleteWebhook).toHaveBeenCalledWith('wh-1');
    });

    it('should show event count for each webhook', () => {
      mockWebhooks.mockReturnValue(mockWebhookList);

      render(<WebhookListPage />);

      expect(screen.getByText('2 event(s)')).toBeInTheDocument();
      expect(screen.getByText('1 event(s)')).toBeInTheDocument();
    });
  });

  // --------------------------------------------------------------------------
  // WebhookDetailPage Tests
  // --------------------------------------------------------------------------

  describe('WebhookDetailPage', () => {
    it('should display webhook detail with configuration', () => {
      mockWebhookDetail.mockReturnValue(mockWebhookDetailData);
      mockDeliveries.mockReturnValue(mockDeliveriesList);

      render(<WebhookDetailPage webhookId="wh-1" />);

      expect(screen.getByText('Webhook Detail')).toBeInTheDocument();
      expect(screen.getByText('https://example.com/hook')).toBeInTheDocument();
      expect(screen.getByText('wh-1')).toBeInTheDocument();
    });

    it('should display subscribed events as badges', () => {
      mockWebhookDetail.mockReturnValue(mockWebhookDetailData);
      mockDeliveries.mockReturnValue(mockDeliveriesList);

      render(<WebhookDetailPage webhookId="wh-1" />);

      expect(screen.getAllByText('user.created').length).toBeGreaterThan(0);
      expect(screen.getAllByText('user.deleted').length).toBeGreaterThan(0);
    });

    it('should show delivery log with status indicators', () => {
      mockWebhookDetail.mockReturnValue(mockWebhookDetailData);
      mockDeliveries.mockReturnValue(mockDeliveriesList);

      render(<WebhookDetailPage webhookId="wh-1" />);

      expect(screen.getByText('Delivery Log')).toBeInTheDocument();
      expect(screen.getAllByText('Delivered').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Failed').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Dead Letter').length).toBeGreaterThan(0);
    });

    it('should show replay button for failed deliveries', () => {
      mockWebhookDetail.mockReturnValue(mockWebhookDetailData);
      mockDeliveries.mockReturnValue(mockDeliveriesList);

      render(<WebhookDetailPage webhookId="wh-1" />);

      // Should have Replay buttons for failed and dead deliveries (2 out of 3)
      const replayButtons = screen.getAllByText('Replay');
      expect(replayButtons).toHaveLength(2);
    });

    it('should call replay when Replay button is clicked', () => {
      mockWebhookDetail.mockReturnValue(mockWebhookDetailData);
      mockDeliveries.mockReturnValue(mockDeliveriesList);

      render(<WebhookDetailPage webhookId="wh-1" />);

      const replayButtons = screen.getAllByText('Replay');
      fireEvent.click(replayButtons[0]!);

      expect(mockReplayDelivery).toHaveBeenCalledWith('wd-2');
    });

    it('should toggle secret visibility', () => {
      mockWebhookDetail.mockReturnValue(mockWebhookDetailData);
      mockDeliveries.mockReturnValue([]);

      render(<WebhookDetailPage webhookId="wh-1" />);

      // Initially hidden
      expect(screen.queryByText('whsec_test123')).not.toBeInTheDocument();

      // Click Show
      fireEvent.click(screen.getByText('Show'));

      // Now visible
      expect(screen.getByText('whsec_test123')).toBeInTheDocument();

      // Click Hide
      fireEvent.click(screen.getByText('Hide'));

      // Hidden again
      expect(screen.queryByText('whsec_test123')).not.toBeInTheDocument();
    });

    it('should call rotate when Rotate Secret is clicked', () => {
      mockWebhookDetail.mockReturnValue(mockWebhookDetailData);
      mockDeliveries.mockReturnValue([]);

      render(<WebhookDetailPage webhookId="wh-1" />);

      fireEvent.click(screen.getByText('Rotate Secret'));

      expect(mockRotateSecret).toHaveBeenCalledWith('wh-1');
    });

    it('should show not found when webhook is null', () => {
      mockWebhookDetail.mockReturnValue(null);
      mockDeliveries.mockReturnValue([]);

      render(<WebhookDetailPage webhookId="wh-nonexistent" />);

      expect(screen.getByText('Webhook not found.')).toBeInTheDocument();
    });

    it('should show empty deliveries message when no deliveries', () => {
      mockWebhookDetail.mockReturnValue(mockWebhookDetailData);
      mockDeliveries.mockReturnValue([]);

      render(<WebhookDetailPage webhookId="wh-1" />);

      expect(screen.getByText('No deliveries recorded yet.')).toBeInTheDocument();
    });

    it('should toggle webhook active status via switch', () => {
      mockWebhookDetail.mockReturnValue(mockWebhookDetailData);
      mockDeliveries.mockReturnValue([]);

      render(<WebhookDetailPage webhookId="wh-1" />);

      const switchBtn = screen.getByRole('switch');
      fireEvent.click(switchBtn);

      expect(mockUpdateWebhook).toHaveBeenCalledWith('wh-1', { isActive: false });
    });
  });
});
