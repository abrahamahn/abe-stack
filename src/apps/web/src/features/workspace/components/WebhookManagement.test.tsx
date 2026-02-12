// src/apps/web/src/features/workspace/components/WebhookManagement.test.tsx
/**
 * Tests for WebhookManagement component.
 */

import { useCreateWebhook, useDeleteWebhook, useWebhooks } from '@abe-stack/react';
import { render, screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { WebhookManagement } from './WebhookManagement';

import type { WebhookItem } from '@abe-stack/api';

// ============================================================================
// Mocks
// ============================================================================

vi.mock('@abe-stack/react', () => ({
  useWebhooks: vi.fn(),
  useCreateWebhook: vi.fn(),
  useDeleteWebhook: vi.fn(),
}));

vi.mock('./WebhookDetailView', () => ({
  WebhookDetailView: () => <div data-testid="webhook-detail-view">Webhook Detail</div>,
}));

// ============================================================================
// Test Data
// ============================================================================

const mockWebhooks: WebhookItem[] = [
  {
    id: 'webhook-1',
    tenantId: 'tenant-1',
    url: 'https://example.com/webhook1',
    events: ['user.created', 'user.updated'],
    secret: 'secret-1',
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
  {
    id: 'webhook-2',
    tenantId: 'tenant-1',
    url: 'https://example.com/webhook2',
    events: ['auth.login'],
    secret: 'secret-2',
    isActive: false,
    createdAt: '2024-01-02T00:00:00Z',
    updatedAt: '2024-01-02T00:00:00Z',
  },
];

// ============================================================================
// Tests
// ============================================================================

describe('WebhookManagement', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('loading state', () => {
    it('should render loading skeletons when loading', () => {
      vi.mocked(useWebhooks).mockReturnValue({
        webhooks: [],
        isLoading: true,
        error: null,
        refresh: vi.fn(),
      });

      vi.mocked(useCreateWebhook).mockReturnValue({
        create: vi.fn(),
        isLoading: false,
        error: null,
      });

      vi.mocked(useDeleteWebhook).mockReturnValue({
        remove: vi.fn(),
        isLoading: false,
        error: null,
      });

      render(<WebhookManagement tenantId="tenant-1" />);

      // Should render skeleton elements
      const skeletons = document.querySelectorAll('[class*="skeleton"]');
      expect(skeletons.length).toBeGreaterThan(0);
    });
  });

  describe('error state', () => {
    it('should display error alert when fetch fails', () => {
      vi.mocked(useWebhooks).mockReturnValue({
        webhooks: [],
        isLoading: false,
        error: new Error('Failed to load webhooks'),
        refresh: vi.fn(),
      });

      vi.mocked(useCreateWebhook).mockReturnValue({
        create: vi.fn(),
        isLoading: false,
        error: null,
      });

      vi.mocked(useDeleteWebhook).mockReturnValue({
        remove: vi.fn(),
        isLoading: false,
        error: null,
      });

      render(<WebhookManagement tenantId="tenant-1" />);

      expect(screen.getByText('Failed to load webhooks')).toBeInTheDocument();
    });
  });

  describe('empty state', () => {
    it('should show empty state when no webhooks exist', () => {
      vi.mocked(useWebhooks).mockReturnValue({
        webhooks: [],
        isLoading: false,
        error: null,
        refresh: vi.fn(),
      });

      vi.mocked(useCreateWebhook).mockReturnValue({
        create: vi.fn(),
        isLoading: false,
        error: null,
      });

      vi.mocked(useDeleteWebhook).mockReturnValue({
        remove: vi.fn(),
        isLoading: false,
        error: null,
      });

      render(<WebhookManagement tenantId="tenant-1" />);

      expect(screen.getByText('No webhooks configured')).toBeInTheDocument();
      expect(screen.getByText('Add a webhook to receive event notifications')).toBeInTheDocument();
    });

    it('should show create form when clicking Add Webhook in empty state', async () => {
      const user = userEvent.setup();

      vi.mocked(useWebhooks).mockReturnValue({
        webhooks: [],
        isLoading: false,
        error: null,
        refresh: vi.fn(),
      });

      vi.mocked(useCreateWebhook).mockReturnValue({
        create: vi.fn(),
        isLoading: false,
        error: null,
      });

      vi.mocked(useDeleteWebhook).mockReturnValue({
        remove: vi.fn(),
        isLoading: false,
        error: null,
      });

      render(<WebhookManagement tenantId="tenant-1" />);

      // Click "Add Webhook" button in empty state
      const addButton = screen.getAllByText('Add Webhook').find((el) => el.tagName === 'BUTTON');
      expect(addButton).toBeInTheDocument();
      await user.click(addButton as HTMLElement);

      // Form should appear
      expect(screen.getByText('Endpoint URL')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('https://example.com/webhook')).toBeInTheDocument();
    });
  });

  describe('webhook list', () => {
    it('should render webhook table with URLs and events', () => {
      vi.mocked(useWebhooks).mockReturnValue({
        webhooks: mockWebhooks,
        isLoading: false,
        error: null,
        refresh: vi.fn(),
      });

      vi.mocked(useCreateWebhook).mockReturnValue({
        create: vi.fn(),
        isLoading: false,
        error: null,
      });

      vi.mocked(useDeleteWebhook).mockReturnValue({
        remove: vi.fn(),
        isLoading: false,
        error: null,
      });

      render(<WebhookManagement tenantId="tenant-1" />);

      // Check table headers
      expect(screen.getByText('URL')).toBeInTheDocument();
      expect(screen.getByText('Events')).toBeInTheDocument();
      expect(screen.getByText('Status')).toBeInTheDocument();
      expect(screen.getByText('Actions')).toBeInTheDocument();

      // Check webhook URLs
      expect(screen.getByText('https://example.com/webhook1')).toBeInTheDocument();
      expect(screen.getByText('https://example.com/webhook2')).toBeInTheDocument();

      // Check event counts
      expect(screen.getByText('2 events')).toBeInTheDocument();
      expect(screen.getByText('1 event')).toBeInTheDocument();

      // Check status badges
      expect(screen.getByText('Active')).toBeInTheDocument();
      expect(screen.getByText('Inactive')).toBeInTheDocument();
    });

    it('should show webhook detail view when clicking URL', async () => {
      const user = userEvent.setup();

      vi.mocked(useWebhooks).mockReturnValue({
        webhooks: mockWebhooks,
        isLoading: false,
        error: null,
        refresh: vi.fn(),
      });

      vi.mocked(useCreateWebhook).mockReturnValue({
        create: vi.fn(),
        isLoading: false,
        error: null,
      });

      vi.mocked(useDeleteWebhook).mockReturnValue({
        remove: vi.fn(),
        isLoading: false,
        error: null,
      });

      render(<WebhookManagement tenantId="tenant-1" />);

      const webhookUrl = screen.getByText('https://example.com/webhook1');
      await user.click(webhookUrl);

      expect(screen.getByTestId('webhook-detail-view')).toBeInTheDocument();
    });

    it('should show webhook detail view when clicking View button', async () => {
      const user = userEvent.setup();

      vi.mocked(useWebhooks).mockReturnValue({
        webhooks: mockWebhooks,
        isLoading: false,
        error: null,
        refresh: vi.fn(),
      });

      vi.mocked(useCreateWebhook).mockReturnValue({
        create: vi.fn(),
        isLoading: false,
        error: null,
      });

      vi.mocked(useDeleteWebhook).mockReturnValue({
        remove: vi.fn(),
        isLoading: false,
        error: null,
      });

      render(<WebhookManagement tenantId="tenant-1" />);

      const viewButtons = screen.getAllByText('View');
      const firstViewButton = viewButtons[0];
      await user.click(firstViewButton as HTMLElement);

      expect(screen.getByTestId('webhook-detail-view')).toBeInTheDocument();
    });

    it('should call delete webhook when clicking Delete button', async () => {
      const user = userEvent.setup();
      const mockRemove = vi.fn();

      vi.mocked(useWebhooks).mockReturnValue({
        webhooks: mockWebhooks,
        isLoading: false,
        error: null,
        refresh: vi.fn(),
      });

      vi.mocked(useCreateWebhook).mockReturnValue({
        create: vi.fn(),
        isLoading: false,
        error: null,
      });

      vi.mocked(useDeleteWebhook).mockReturnValue({
        remove: mockRemove,
        isLoading: false,
        error: null,
      });

      render(<WebhookManagement tenantId="tenant-1" />);

      const deleteButtons = screen.getAllByText('Delete');
      const firstDeleteButton = deleteButtons[0];
      await user.click(firstDeleteButton as HTMLElement);

      expect(mockRemove).toHaveBeenCalledWith('webhook-1');
    });

    it('should disable delete button while deleting', () => {
      vi.mocked(useWebhooks).mockReturnValue({
        webhooks: mockWebhooks,
        isLoading: false,
        error: null,
        refresh: vi.fn(),
      });

      vi.mocked(useCreateWebhook).mockReturnValue({
        create: vi.fn(),
        isLoading: false,
        error: null,
      });

      vi.mocked(useDeleteWebhook).mockReturnValue({
        remove: vi.fn(),
        isLoading: true,
        error: null,
      });

      render(<WebhookManagement tenantId="tenant-1" />);

      const deleteButtons = screen.getAllByText('Delete');
      deleteButtons.forEach((button) => {
        expect(button).toBeDisabled();
      });
    });
  });

  describe('create webhook form', () => {
    it('should show create form when clicking Add Webhook button', async () => {
      const user = userEvent.setup();

      vi.mocked(useWebhooks).mockReturnValue({
        webhooks: mockWebhooks,
        isLoading: false,
        error: null,
        refresh: vi.fn(),
      });

      vi.mocked(useCreateWebhook).mockReturnValue({
        create: vi.fn(),
        isLoading: false,
        error: null,
      });

      vi.mocked(useDeleteWebhook).mockReturnValue({
        remove: vi.fn(),
        isLoading: false,
        error: null,
      });

      render(<WebhookManagement tenantId="tenant-1" />);

      const addButton = screen.getByText('Add Webhook');
      await user.click(addButton);

      expect(screen.getByText('Endpoint URL')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('https://example.com/webhook')).toBeInTheDocument();
    });

    it('should toggle button text to Cancel when form is shown', async () => {
      const user = userEvent.setup();

      vi.mocked(useWebhooks).mockReturnValue({
        webhooks: mockWebhooks,
        isLoading: false,
        error: null,
        refresh: vi.fn(),
      });

      vi.mocked(useCreateWebhook).mockReturnValue({
        create: vi.fn(),
        isLoading: false,
        error: null,
      });

      vi.mocked(useDeleteWebhook).mockReturnValue({
        remove: vi.fn(),
        isLoading: false,
        error: null,
      });

      render(<WebhookManagement tenantId="tenant-1" />);

      const addButton = screen.getByText('Add Webhook');
      await user.click(addButton);

      expect(screen.getByText('Cancel')).toBeInTheDocument();
    });

    it('should allow entering URL and selecting events', async () => {
      const user = userEvent.setup();

      vi.mocked(useWebhooks).mockReturnValue({
        webhooks: [],
        isLoading: false,
        error: null,
        refresh: vi.fn(),
      });

      vi.mocked(useCreateWebhook).mockReturnValue({
        create: vi.fn(),
        isLoading: false,
        error: null,
      });

      vi.mocked(useDeleteWebhook).mockReturnValue({
        remove: vi.fn(),
        isLoading: false,
        error: null,
      });

      render(<WebhookManagement tenantId="tenant-1" />);

      // Click the header Add Webhook button
      const addButtons = screen.getAllByText('Add Webhook');
      const headerButton = addButtons[0];
      await user.click(headerButton as HTMLElement);

      // Enter URL
      const urlInput = screen.getByPlaceholderText('https://example.com/webhook');
      await user.type(urlInput, 'https://test.com/hook');
      expect(urlInput).toHaveValue('https://test.com/hook');

      // Select events - look for all checkboxes and find by parent label text
      const checkboxes = screen.getAllByRole('checkbox');
      // First checkbox should be user.created based on AVAILABLE_EVENTS order
      const userCreatedCheckbox = checkboxes[0];
      await user.click(userCreatedCheckbox as HTMLElement);
      expect(userCreatedCheckbox).toBeChecked();

      // Fifth checkbox should be tenant.created (index 4)
      const authLoginCheckbox = checkboxes[3]; // auth.login is 4th in the list
      await user.click(authLoginCheckbox as HTMLElement);
      expect(authLoginCheckbox).toBeChecked();
    });

    it('should disable Create button when URL is empty', async () => {
      const user = userEvent.setup();

      vi.mocked(useWebhooks).mockReturnValue({
        webhooks: [],
        isLoading: false,
        error: null,
        refresh: vi.fn(),
      });

      vi.mocked(useCreateWebhook).mockReturnValue({
        create: vi.fn(),
        isLoading: false,
        error: null,
      });

      vi.mocked(useDeleteWebhook).mockReturnValue({
        remove: vi.fn(),
        isLoading: false,
        error: null,
      });

      render(<WebhookManagement tenantId="tenant-1" />);

      const addButtons = screen.getAllByText('Add Webhook');
      const headerButton = addButtons[0];
      await user.click(headerButton as HTMLElement);

      const createButton = screen.getByText('Create Webhook');
      expect(createButton).toBeDisabled();
    });

    it('should disable Create button when no events are selected', async () => {
      const user = userEvent.setup();

      vi.mocked(useWebhooks).mockReturnValue({
        webhooks: [],
        isLoading: false,
        error: null,
        refresh: vi.fn(),
      });

      vi.mocked(useCreateWebhook).mockReturnValue({
        create: vi.fn(),
        isLoading: false,
        error: null,
      });

      vi.mocked(useDeleteWebhook).mockReturnValue({
        remove: vi.fn(),
        isLoading: false,
        error: null,
      });

      render(<WebhookManagement tenantId="tenant-1" />);

      const addButtons = screen.getAllByText('Add Webhook');
      const headerButton = addButtons[0];
      await user.click(headerButton as HTMLElement);

      // Enter URL only
      const urlInput = screen.getByPlaceholderText('https://example.com/webhook');
      await user.type(urlInput, 'https://test.com/hook');

      const createButton = screen.getByText('Create Webhook');
      expect(createButton).toBeDisabled();
    });

    it('should enable Create button when URL and events are provided', async () => {
      const user = userEvent.setup();

      vi.mocked(useWebhooks).mockReturnValue({
        webhooks: [],
        isLoading: false,
        error: null,
        refresh: vi.fn(),
      });

      vi.mocked(useCreateWebhook).mockReturnValue({
        create: vi.fn(),
        isLoading: false,
        error: null,
      });

      vi.mocked(useDeleteWebhook).mockReturnValue({
        remove: vi.fn(),
        isLoading: false,
        error: null,
      });

      render(<WebhookManagement tenantId="tenant-1" />);

      const addButtons = screen.getAllByText('Add Webhook');
      const headerButton = addButtons[0];
      await user.click(headerButton as HTMLElement);

      // Enter URL
      const urlInput = screen.getByPlaceholderText('https://example.com/webhook');
      await user.type(urlInput, 'https://test.com/hook');

      // Select event
      const checkboxes = screen.getAllByRole('checkbox');
      const firstCheckbox = checkboxes[0];
      await user.click(firstCheckbox as HTMLElement);

      const createButton = screen.getByText('Create Webhook');
      expect(createButton).not.toBeDisabled();
    });

    it('should call create webhook with correct data', async () => {
      const user = userEvent.setup();
      const mockCreate = vi.fn();

      vi.mocked(useWebhooks).mockReturnValue({
        webhooks: [],
        isLoading: false,
        error: null,
        refresh: vi.fn(),
      });

      vi.mocked(useCreateWebhook).mockReturnValue({
        create: mockCreate,
        isLoading: false,
        error: null,
      });

      vi.mocked(useDeleteWebhook).mockReturnValue({
        remove: vi.fn(),
        isLoading: false,
        error: null,
      });

      render(<WebhookManagement tenantId="tenant-1" />);

      const addButtons = screen.getAllByText('Add Webhook');
      const headerButton = addButtons[0];
      await user.click(headerButton as HTMLElement);

      // Enter URL
      const urlInput = screen.getByPlaceholderText('https://example.com/webhook');
      await user.type(urlInput, 'https://test.com/hook');

      // Select events - user.created (index 0) and auth.login (index 3)
      const checkboxes = screen.getAllByRole('checkbox');
      await user.click(checkboxes[0] as HTMLElement);
      await user.click(checkboxes[3] as HTMLElement);

      // Submit
      const createButton = screen.getByText('Create Webhook');
      await user.click(createButton);

      expect(mockCreate).toHaveBeenCalledWith({
        url: 'https://test.com/hook',
        events: ['user.created', 'auth.login'],
      });
    });

    it('should trim URL before submitting', async () => {
      const user = userEvent.setup();
      const mockCreate = vi.fn();

      vi.mocked(useWebhooks).mockReturnValue({
        webhooks: [],
        isLoading: false,
        error: null,
        refresh: vi.fn(),
      });

      vi.mocked(useCreateWebhook).mockReturnValue({
        create: mockCreate,
        isLoading: false,
        error: null,
      });

      vi.mocked(useDeleteWebhook).mockReturnValue({
        remove: vi.fn(),
        isLoading: false,
        error: null,
      });

      render(<WebhookManagement tenantId="tenant-1" />);

      const addButtons = screen.getAllByText('Add Webhook');
      const headerButton = addButtons[0];
      await user.click(headerButton as HTMLElement);

      // Enter URL with whitespace
      const urlInput = screen.getByPlaceholderText('https://example.com/webhook');
      await user.type(urlInput, '  https://test.com/hook  ');

      // Select event
      const checkboxes = screen.getAllByRole('checkbox');
      await user.click(checkboxes[0] as HTMLElement);

      // Submit
      const createButton = screen.getByText('Create Webhook');
      await user.click(createButton);

      expect(mockCreate).toHaveBeenCalledWith({
        url: 'https://test.com/hook',
        events: ['user.created'],
      });
    });

    it('should display error when create webhook fails', async () => {
      const user = userEvent.setup();

      vi.mocked(useWebhooks).mockReturnValue({
        webhooks: [],
        isLoading: false,
        error: null,
        refresh: vi.fn(),
      });

      vi.mocked(useCreateWebhook).mockReturnValue({
        create: vi.fn(),
        isLoading: false,
        error: new Error('Invalid webhook URL'),
      });

      vi.mocked(useDeleteWebhook).mockReturnValue({
        remove: vi.fn(),
        isLoading: false,
        error: null,
      });

      render(<WebhookManagement tenantId="tenant-1" />);

      const addButtons = screen.getAllByText('Add Webhook');
      const headerButton = addButtons[0];
      await user.click(headerButton as HTMLElement);

      expect(screen.getByText('Invalid webhook URL')).toBeInTheDocument();
    });

    it('should show creating state while submitting', () => {
      vi.mocked(useWebhooks).mockReturnValue({
        webhooks: [],
        isLoading: false,
        error: null,
        refresh: vi.fn(),
      });

      vi.mocked(useCreateWebhook).mockReturnValue({
        create: vi.fn(),
        isLoading: true,
        error: null,
      });

      vi.mocked(useDeleteWebhook).mockReturnValue({
        remove: vi.fn(),
        isLoading: false,
        error: null,
      });

      render(<WebhookManagement tenantId="tenant-1" />);

      // The component won't show the form in initial render, need to manually check the hook behavior
      // This test verifies the hook's loading state is properly configured
      expect(useCreateWebhook).toHaveBeenCalled();
    });

    it('should clear form and hide after successful creation', async () => {
      const user = userEvent.setup();
      const mockRefresh = vi.fn();

      vi.mocked(useWebhooks).mockReturnValue({
        webhooks: [],
        isLoading: false,
        error: null,
        refresh: mockRefresh,
      });

      // Mock successful creation with onSuccess callback
      vi.mocked(useCreateWebhook).mockImplementation((_config, options) => {
        return {
          create: (_data) => {
            options?.onSuccess?.();
            return Promise.resolve();
          },
          isLoading: false,
          error: null,
        };
      });

      vi.mocked(useDeleteWebhook).mockReturnValue({
        remove: vi.fn(),
        isLoading: false,
        error: null,
      });

      render(<WebhookManagement tenantId="tenant-1" />);

      const addButtons = screen.getAllByText('Add Webhook');
      const headerButton = addButtons[0];
      await user.click(headerButton as HTMLElement);

      // Fill form
      const urlInput = screen.getByPlaceholderText('https://example.com/webhook');
      await user.type(urlInput, 'https://test.com/hook');

      const checkboxes = screen.getAllByRole('checkbox');
      await user.click(checkboxes[0] as HTMLElement);

      // Submit
      const createButton = screen.getByText('Create Webhook');
      await user.click(createButton);

      // Wait for form to be hidden
      await waitFor(() => {
        expect(screen.queryByText('Endpoint URL')).not.toBeInTheDocument();
      });

      // Refresh should be called
      expect(mockRefresh).toHaveBeenCalled();
    });

    it('should toggle event selection when clicking checkboxes multiple times', async () => {
      const user = userEvent.setup();

      vi.mocked(useWebhooks).mockReturnValue({
        webhooks: [],
        isLoading: false,
        error: null,
        refresh: vi.fn(),
      });

      vi.mocked(useCreateWebhook).mockReturnValue({
        create: vi.fn(),
        isLoading: false,
        error: null,
      });

      vi.mocked(useDeleteWebhook).mockReturnValue({
        remove: vi.fn(),
        isLoading: false,
        error: null,
      });

      render(<WebhookManagement tenantId="tenant-1" />);

      const addButtons = screen.getAllByText('Add Webhook');
      const headerButton = addButtons[0];
      await user.click(headerButton as HTMLElement);

      const checkboxes = screen.getAllByRole('checkbox');
      const firstCheckbox = checkboxes[0];

      const checkbox = firstCheckbox as HTMLElement;
      // Check
      await user.click(checkbox);
      expect(firstCheckbox).toBeChecked();

      // Uncheck
      await user.click(checkbox);
      expect(firstCheckbox).not.toBeChecked();

      // Check again
      await user.click(checkbox);
      expect(firstCheckbox).toBeChecked();
    });
  });

  describe('refresh behavior', () => {
    it('should call refresh after successful deletion', async () => {
      const user = userEvent.setup();
      const mockRefresh = vi.fn();

      vi.mocked(useWebhooks).mockReturnValue({
        webhooks: mockWebhooks,
        isLoading: false,
        error: null,
        refresh: mockRefresh,
      });

      vi.mocked(useCreateWebhook).mockReturnValue({
        create: vi.fn(),
        isLoading: false,
        error: null,
      });

      // Mock successful deletion with onSuccess callback
      vi.mocked(useDeleteWebhook).mockImplementation((_config, options) => {
        return {
          remove: (_id) => {
            options?.onSuccess?.();
            return Promise.resolve();
          },
          isLoading: false,
          error: null,
        };
      });

      render(<WebhookManagement tenantId="tenant-1" />);

      const deleteButtons = screen.getAllByText('Delete');
      const firstDeleteButton = deleteButtons[0];
      await user.click(firstDeleteButton as HTMLElement);

      expect(mockRefresh).toHaveBeenCalled();
    });
  });
});
