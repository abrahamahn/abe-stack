// main/apps/web/src/features/settings/components/NotificationPreferencesForm.test.tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { NotificationPreferencesForm } from './NotificationPreferencesForm';

import type { ReactNode } from 'react';

// Types for mocking
interface MockPreferences {
  userId: string;
  globalEnabled: boolean;
  quietHours: { enabled: boolean; startHour: number; endHour: number; timezone: string };
  types: Record<string, { enabled: boolean; channels: Array<'push' | 'email' | 'sms' | 'in_app'> }>;
  updatedAt: Date;
}

interface MockState {
  preferences: MockPreferences | null;
  isLoading: boolean;
  isSaving: boolean;
  error: Error | null;
  updatePreferences: ReturnType<typeof vi.fn>;
  refresh: ReturnType<typeof vi.fn>;
}

const mockUpdatePreferences = vi.fn().mockResolvedValue(undefined);
const mockRefresh = vi.fn().mockResolvedValue(undefined);

let mockState: MockState = {
  preferences: null,
  isLoading: false,
  isSaving: false,
  error: null,
  updatePreferences: mockUpdatePreferences,
  refresh: mockRefresh,
};

vi.mock('@bslt/react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@bslt/react')>();
  return {
    ...actual,
    useNotificationPreferences: () => mockState,
  };
});

vi.mock('@bslt/ui', async () => {
  const actual = await vi.importActual('@bslt/ui');
  return {
    ...actual,
    Alert: ({ children, tone }: { children: ReactNode; tone: string }) => (
      <div data-testid="alert" data-tone={tone}>
        {children}
      </div>
    ),
    Skeleton: (props: { width?: string | number; height?: string | number }) => (
      <div data-testid="skeleton" style={{ width: props.width, height: props.height }} />
    ),
    EmptyState: ({ title, description }: { title: string; description?: string }) => (
      <div data-testid="empty-state">
        <h3>{title}</h3>
        {description != null && <p>{description}</p>}
      </div>
    ),
    Checkbox: ({
      checked,
      onChange,
      disabled,
      label,
    }: {
      checked?: boolean;
      onChange?: (checked: boolean) => void;
      disabled?: boolean;
      label?: ReactNode;
    }) => (
      <label>
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange?.(e.target.checked)}
          disabled={disabled}
        />
        {label != null && <span>{label}</span>}
      </label>
    ),
  };
});

const buildPreferences = (overrides?: Partial<MockPreferences>): MockPreferences => ({
  userId: 'user-1',
  globalEnabled: true,
  quietHours: { enabled: false, startHour: 22, endHour: 8, timezone: 'UTC' },
  types: {
    system: { enabled: true, channels: ['push', 'email', 'in_app'] },
    security: { enabled: true, channels: ['push', 'email', 'in_app'] },
    transactional: { enabled: true, channels: ['email'] },
    social: { enabled: true, channels: ['push', 'in_app'] },
    marketing: { enabled: false, channels: ['email'] },
  },
  updatedAt: new Date('2026-02-11T10:00:00Z'),
  ...overrides,
});

describe('NotificationPreferencesForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockState = {
      preferences: null,
      isLoading: false,
      isSaving: false,
      error: null,
      updatePreferences: mockUpdatePreferences,
      refresh: mockRefresh,
    };
  });

  describe('loading state', () => {
    it('should render skeleton placeholders when loading', () => {
      mockState.isLoading = true;

      render(<NotificationPreferencesForm />);

      expect(screen.getAllByTestId('skeleton').length).toBeGreaterThan(0);
    });
  });

  describe('error state', () => {
    it('should render error alert when no preferences and error', () => {
      mockState.error = new Error('Network error');
      mockState.preferences = null;

      render(<NotificationPreferencesForm />);

      expect(screen.getByText('Network error')).toBeInTheDocument();
    });
  });

  describe('empty state', () => {
    it('should show empty state when no preferences found', () => {
      mockState.preferences = null;

      render(<NotificationPreferencesForm />);

      expect(screen.getByTestId('empty-state')).toBeInTheDocument();
      expect(screen.getByText('No preferences found')).toBeInTheDocument();
    });
  });

  describe('global toggle', () => {
    it('should render global notifications toggle', () => {
      mockState.preferences = buildPreferences();

      render(<NotificationPreferencesForm />);

      expect(screen.getByText('Notifications')).toBeInTheDocument();
      expect(screen.getByText('Enable or disable all notifications globally.')).toBeInTheDocument();
    });

    it('should call updatePreferences when global toggle is clicked', async () => {
      const user = userEvent.setup();
      mockState.preferences = buildPreferences({ globalEnabled: true });

      render(<NotificationPreferencesForm />);

      // Find the first switch (global toggle) and click it
      const switches = screen.getAllByRole('switch');
      const globalSwitch = switches[0] as HTMLElement;
      await user.click(globalSwitch);

      expect(mockUpdatePreferences).toHaveBeenCalledWith({ globalEnabled: false });
    });
  });

  describe('notification types', () => {
    it('should render all notification type sections when enabled', () => {
      mockState.preferences = buildPreferences();

      render(<NotificationPreferencesForm />);

      expect(screen.getByText('System')).toBeInTheDocument();
      expect(screen.getByText('Security')).toBeInTheDocument();
      expect(screen.getByText('Transactional')).toBeInTheDocument();
      expect(screen.getByText('Social')).toBeInTheDocument();
      expect(screen.getByText('Marketing')).toBeInTheDocument();
    });

    it('should hide notification types when global is disabled', () => {
      mockState.preferences = buildPreferences({ globalEnabled: false });

      render(<NotificationPreferencesForm />);

      expect(screen.queryByText('Notification Types')).not.toBeInTheDocument();
      expect(screen.queryByText('System')).not.toBeInTheDocument();
    });

    it('should call updatePreferences when type toggle is clicked', async () => {
      const user = userEvent.setup();
      mockState.preferences = buildPreferences();

      render(<NotificationPreferencesForm />);

      // System type is the first type toggle (index 1, after global toggle at index 0)
      const switches = screen.getAllByRole('switch');
      // switches[0] = global, switches[1] = system, switches[2] = security, etc.
      const systemSwitch = switches[1] as HTMLElement;
      await user.click(systemSwitch);

      expect(mockUpdatePreferences).toHaveBeenCalledWith({
        types: { system: { enabled: false } },
      });
    });
  });

  describe('channel checkboxes', () => {
    it('should render channel checkboxes for enabled types', () => {
      mockState.preferences = buildPreferences();

      render(<NotificationPreferencesForm />);

      // Each enabled type shows Push, Email, In-App checkboxes
      const pushLabels = screen.getAllByText('Push');
      expect(pushLabels.length).toBeGreaterThan(0);
    });

    it('should not render channel checkboxes for disabled types', () => {
      // Marketing is disabled by default in our mock
      mockState.preferences = buildPreferences();

      render(<NotificationPreferencesForm />);

      // Count checkbox groups — marketing (disabled) should not have checkboxes
      // There are 4 enabled types (system, security, transactional, social)
      // Each has 3 channels = 12 checkboxes minimum
      const checkboxes = screen.getAllByRole('checkbox');
      // 4 enabled types * 3 channels = 12
      expect(checkboxes.length).toBe(12);
    });
  });

  describe('quiet hours', () => {
    it('should render quiet hours section when global is enabled', () => {
      mockState.preferences = buildPreferences();

      render(<NotificationPreferencesForm />);

      expect(screen.getByText('Quiet Hours')).toBeInTheDocument();
    });

    it('should show time inputs when quiet hours is enabled', () => {
      mockState.preferences = buildPreferences({
        quietHours: { enabled: true, startHour: 22, endHour: 8, timezone: 'UTC' },
      });

      render(<NotificationPreferencesForm />);

      expect(screen.getByText('From (hour)')).toBeInTheDocument();
      expect(screen.getByText('To (hour)')).toBeInTheDocument();
      expect(screen.getByText('(UTC)')).toBeInTheDocument();
    });

    it('should hide time inputs when quiet hours is disabled', () => {
      mockState.preferences = buildPreferences({
        quietHours: { enabled: false, startHour: 22, endHour: 8, timezone: 'UTC' },
      });

      render(<NotificationPreferencesForm />);

      expect(screen.queryByText('From (hour)')).not.toBeInTheDocument();
    });

    it('should call updatePreferences when quiet hours toggle is clicked', async () => {
      const user = userEvent.setup();
      mockState.preferences = buildPreferences();

      render(<NotificationPreferencesForm />);

      // Quiet hours toggle is the last switch
      const switches = screen.getAllByRole('switch');
      const quietHoursSwitch = switches[switches.length - 1] as HTMLElement;
      await user.click(quietHoursSwitch);

      expect(mockUpdatePreferences).toHaveBeenCalledWith({
        quietHours: { enabled: true },
      });
    });
  });

  describe('save error display', () => {
    it('should show inline error when preferences exist but error occurs', () => {
      mockState.preferences = buildPreferences();
      mockState.error = new Error('Save failed');

      render(<NotificationPreferencesForm />);

      expect(screen.getByText('Save failed')).toBeInTheDocument();
    });
  });

  describe('disabled state', () => {
    it('should disable switches while saving', () => {
      mockState.preferences = buildPreferences();
      mockState.isSaving = true;

      render(<NotificationPreferencesForm />);

      const switches = screen.getAllByRole('switch');
      for (const sw of switches) {
        expect(sw).toBeDisabled();
      }
    });
  });
});
