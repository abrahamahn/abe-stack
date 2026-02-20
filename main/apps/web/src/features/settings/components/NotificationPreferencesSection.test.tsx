// main/apps/web/src/features/settings/components/NotificationPreferencesSection.test.tsx
/**
 * Tests for NotificationPreferencesSection component.
 */

import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// ============================================================================
// Mocks
// ============================================================================

const mockNavigate = vi.fn();

vi.mock('@bslt/react/router', () => ({
  useNavigate: () => mockNavigate,
}));

import { NotificationPreferencesSection } from './NotificationPreferencesSection';

// ============================================================================
// Tests
// ============================================================================

describe('NotificationPreferencesSection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render section heading and description', () => {
    render(<NotificationPreferencesSection />);
    expect(screen.getByText('Notifications')).toBeInTheDocument();
    expect(screen.getByText(/Control which notifications you receive/)).toBeInTheDocument();
  });

  it('should render feature summary bullets', () => {
    render(<NotificationPreferencesSection />);
    expect(screen.getByText('Push, email, and in-app notification channels')).toBeInTheDocument();
    expect(screen.getByText(/Per-type toggles/)).toBeInTheDocument();
    expect(screen.getByText('Quiet hours scheduling')).toBeInTheDocument();
  });

  it('should render manage notifications button', () => {
    render(<NotificationPreferencesSection />);
    expect(screen.getByTestId('manage-notifications-button')).toHaveTextContent(
      'Manage Notifications',
    );
  });

  it('should navigate to default preferences URL on button click', async () => {
    const user = userEvent.setup();
    render(<NotificationPreferencesSection />);

    await user.click(screen.getByTestId('manage-notifications-button'));
    expect(mockNavigate).toHaveBeenCalledWith('/settings/notifications');
  });

  it('should navigate to custom preferences URL when provided', async () => {
    const user = userEvent.setup();
    render(<NotificationPreferencesSection preferenceCenterUrl="/notifications/manage" />);

    await user.click(screen.getByTestId('manage-notifications-button'));
    expect(mockNavigate).toHaveBeenCalledWith('/notifications/manage');
  });
});
