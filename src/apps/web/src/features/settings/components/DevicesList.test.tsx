// src/apps/web/src/features/settings/components/DevicesList.test.tsx
/**
 * DevicesList Component Tests
 *
 * Tests for device list display, trust, revoke interactions, and loading/error states.
 */

import { useDevices } from '@abe-stack/react';
import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { DevicesList } from './DevicesList';

import type { DeviceItem } from '@abe-stack/api';
import type { DevicesState } from '@abe-stack/react';
import type { ReactNode } from 'react';

// ============================================================================
// Mocks
// ============================================================================

vi.mock('@abe-stack/react', () => ({
  useDevices: vi.fn(),
}));

vi.mock('@abe-stack/ui', () => {
  const mockAlert = ({ children, tone }: { children: ReactNode; tone?: string }) => (
    <div data-testid="alert" data-variant={tone}>
      {children}
    </div>
  );

  const mockButton = ({
    children,
    onClick,
    disabled,
    variant,
    size,
    type = 'button',
  }: {
    children: ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    variant?: string;
    size?: string;
    type?: 'button' | 'submit' | 'reset';
  }) => (
    <button
      data-testid="button"
      onClick={onClick}
      disabled={disabled}
      data-variant={variant}
      data-size={size}
      type={type}
    >
      {children}
    </button>
  );

  const mockCard = ({ children, className }: { children: ReactNode; className?: string }) => (
    <div data-testid="card" className={className}>
      {children}
    </div>
  );

  const mockHeading = ({
    children,
    as: _as,
    size,
    className,
  }: {
    children: ReactNode;
    as?: string;
    size?: string;
    className?: string;
  }) => (
    <div data-testid="heading" data-size={size} className={className}>
      {children}
    </div>
  );

  const mockSkeleton = ({ className }: { className?: string }) => (
    <div data-testid="skeleton" className={className} />
  );

  const mockText = ({
    children,
    tone,
    size,
    weight,
    className,
  }: {
    children: ReactNode;
    tone?: string;
    size?: string;
    weight?: string;
    className?: string;
  }) => (
    <span
      data-testid="text"
      data-tone={tone}
      data-size={size}
      data-weight={weight}
      className={className}
    >
      {children}
    </span>
  );

  return {
    Alert: mockAlert,
    Button: mockButton,
    Card: mockCard,
    Heading: mockHeading,
    Skeleton: mockSkeleton,
    Text: mockText,
  };
});

// ============================================================================
// Test Helpers
// ============================================================================

function createMockDevice(overrides: Partial<DeviceItem> = {}): DeviceItem {
  return {
    id: 'device-1',
    deviceFingerprint: 'abc123hash',
    label: null,
    ipAddress: '192.168.1.1',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120',
    firstSeenAt: '2024-01-01T00:00:00.000Z',
    lastSeenAt: '2024-01-15T10:00:00.000Z',
    trusted: false,
    createdAt: '2024-01-01T00:00:00.000Z',
    ...overrides,
  };
}

const defaultHookReturn: DevicesState = {
  devices: [],
  isLoading: false,
  error: null,
  refresh: vi.fn().mockResolvedValue(undefined),
  trustDevice: vi.fn().mockResolvedValue(undefined),
  revokeDevice: vi.fn().mockResolvedValue(undefined),
  invalidateSessions: vi.fn().mockResolvedValue(undefined),
};

// ============================================================================
// Tests
// ============================================================================

describe('DevicesList', () => {
  let mockTrustDevice: ReturnType<
    typeof vi.fn<(deviceId: string) => Promise<{ device: DeviceItem }>>
  >;
  let mockRevokeDevice: ReturnType<
    typeof vi.fn<(deviceId: string) => Promise<{ message: string }>>
  >;

  beforeEach(() => {
    mockTrustDevice = vi
      .fn<(deviceId: string) => Promise<{ device: DeviceItem }>>()
      .mockResolvedValue({ device: {} as DeviceItem });
    mockRevokeDevice = vi
      .fn<(deviceId: string) => Promise<{ message: string }>>()
      .mockResolvedValue({ message: 'ok' });

    vi.mocked(useDevices).mockReturnValue({
      ...defaultHookReturn,
      trustDevice: mockTrustDevice,
      revokeDevice: mockRevokeDevice,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // --------------------------------------------------------------------------
  // Loading State
  // --------------------------------------------------------------------------

  describe('loading state', () => {
    it('should render skeleton UI when loading', () => {
      vi.mocked(useDevices).mockReturnValue({
        ...defaultHookReturn,
        isLoading: true,
      });

      render(<DevicesList baseUrl="" />);

      const skeletons = screen.getAllByTestId('skeleton');
      expect(skeletons.length).toBeGreaterThan(0);
    });

    it('should not render device list when loading', () => {
      vi.mocked(useDevices).mockReturnValue({
        ...defaultHookReturn,
        isLoading: true,
      });

      render(<DevicesList baseUrl="" />);

      expect(screen.queryByTestId('heading')).not.toBeInTheDocument();
    });
  });

  // --------------------------------------------------------------------------
  // Error State
  // --------------------------------------------------------------------------

  describe('error state', () => {
    it('should render error alert when error exists', () => {
      vi.mocked(useDevices).mockReturnValue({
        ...defaultHookReturn,
        error: new Error('Failed to load devices'),
      });

      render(<DevicesList baseUrl="" />);

      expect(screen.getByText('Failed to load devices')).toBeInTheDocument();
    });

    it('should render danger variant alert', () => {
      vi.mocked(useDevices).mockReturnValue({
        ...defaultHookReturn,
        error: new Error('Network error'),
      });

      render(<DevicesList baseUrl="" />);

      const alert = screen.getByTestId('alert');
      expect(alert).toHaveAttribute('data-variant', 'danger');
    });
  });

  // --------------------------------------------------------------------------
  // Empty State
  // --------------------------------------------------------------------------

  describe('empty state', () => {
    it('should render empty message when no devices', () => {
      render(<DevicesList baseUrl="" />);

      expect(screen.getByText(/No devices recorded yet/)).toBeInTheDocument();
    });
  });

  // --------------------------------------------------------------------------
  // Device List
  // --------------------------------------------------------------------------

  describe('device list', () => {
    const devices = [
      createMockDevice({ id: 'device-1', trusted: false }),
      createMockDevice({
        id: 'device-2',
        trusted: true,
        label: 'My Laptop',
        ipAddress: '10.0.0.1',
      }),
    ];

    beforeEach(() => {
      vi.mocked(useDevices).mockReturnValue({
        ...defaultHookReturn,
        devices,
        trustDevice: mockTrustDevice,
        revokeDevice: mockRevokeDevice,
      });
    });

    it('should render the correct number of devices', () => {
      render(<DevicesList baseUrl="" />);

      expect(screen.getByText(/Known Devices \(2\)/)).toBeInTheDocument();
    });

    it('should display device label when available', () => {
      render(<DevicesList baseUrl="" />);

      expect(screen.getByText('My Laptop')).toBeInTheDocument();
    });

    it('should display parsed browser name for unlabeled devices', () => {
      render(<DevicesList baseUrl="" />);

      expect(screen.getByText('Chrome')).toBeInTheDocument();
    });

    it('should display "Trusted" badge for trusted devices', () => {
      render(<DevicesList baseUrl="" />);

      expect(screen.getByText('Trusted')).toBeInTheDocument();
    });

    it('should display IP address for each device', () => {
      render(<DevicesList baseUrl="" />);

      expect(screen.getByText(/192\.168\.1\.1/)).toBeInTheDocument();
      expect(screen.getByText(/10\.0\.0\.1/)).toBeInTheDocument();
    });

    it('should render "Trust" button only for untrusted devices', () => {
      render(<DevicesList baseUrl="" />);

      const trustButtons = screen.getAllByText('Trust');
      expect(trustButtons).toHaveLength(1);
    });

    it('should render "Remove" button for all devices', () => {
      render(<DevicesList baseUrl="" />);

      const removeButtons = screen.getAllByText('Remove');
      expect(removeButtons).toHaveLength(2);
    });
  });

  // --------------------------------------------------------------------------
  // Interactions
  // --------------------------------------------------------------------------

  describe('interactions', () => {
    const devices = [
      createMockDevice({ id: 'device-1', trusted: false }),
      createMockDevice({ id: 'device-2', trusted: true }),
    ];

    beforeEach(() => {
      vi.mocked(useDevices).mockReturnValue({
        ...defaultHookReturn,
        devices,
        trustDevice: mockTrustDevice,
        revokeDevice: mockRevokeDevice,
      });
    });

    it('should call trustDevice when Trust button is clicked', () => {
      render(<DevicesList baseUrl="" />);

      const trustButton = screen.getByText('Trust');
      fireEvent.click(trustButton);

      expect(mockTrustDevice).toHaveBeenCalledWith('device-1');
    });

    it('should call revokeDevice when Remove button is clicked', () => {
      render(<DevicesList baseUrl="" />);

      const removeButtons = screen.getAllByText('Remove');
      fireEvent.click(removeButtons[0] as HTMLElement);

      expect(mockRevokeDevice).toHaveBeenCalledWith('device-1');
    });
  });

  // --------------------------------------------------------------------------
  // UA Parsing
  // --------------------------------------------------------------------------

  describe('user agent parsing', () => {
    it('should display "Firefox" for Firefox UA', () => {
      vi.mocked(useDevices).mockReturnValue({
        ...defaultHookReturn,
        devices: [createMockDevice({ userAgent: 'Mozilla/5.0 Firefox/120' })],
        trustDevice: mockTrustDevice,
        revokeDevice: mockRevokeDevice,
      });

      render(<DevicesList baseUrl="" />);

      expect(screen.getByText('Firefox')).toBeInTheDocument();
    });

    it('should display "Safari" for Safari UA', () => {
      vi.mocked(useDevices).mockReturnValue({
        ...defaultHookReturn,
        devices: [
          createMockDevice({ userAgent: 'Mozilla/5.0 (Macintosh) AppleWebKit/605 Safari/605' }),
        ],
        trustDevice: mockTrustDevice,
        revokeDevice: mockRevokeDevice,
      });

      render(<DevicesList baseUrl="" />);

      expect(screen.getByText('Safari')).toBeInTheDocument();
    });

    it('should display "Edge" for Edge UA', () => {
      vi.mocked(useDevices).mockReturnValue({
        ...defaultHookReturn,
        devices: [createMockDevice({ userAgent: 'Mozilla/5.0 Chrome/120 Edg/120' })],
        trustDevice: mockTrustDevice,
        revokeDevice: mockRevokeDevice,
      });

      render(<DevicesList baseUrl="" />);

      expect(screen.getByText('Edge')).toBeInTheDocument();
    });

    it('should display "Unknown browser" for null UA', () => {
      vi.mocked(useDevices).mockReturnValue({
        ...defaultHookReturn,
        devices: [createMockDevice({ userAgent: null })],
        trustDevice: mockTrustDevice,
        revokeDevice: mockRevokeDevice,
      });

      render(<DevicesList baseUrl="" />);

      expect(screen.getByText('Unknown browser')).toBeInTheDocument();
    });
  });
});
