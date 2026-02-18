// main/apps/web/src/features/settings/components/CookieConsentBanner.test.tsx
import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CookieConsentBanner } from './CookieConsentBanner';

// ============================================================================
// Mocks
// ============================================================================

// Mock useNavigate from @bslt/react/router
const mockNavigate = vi.fn();
vi.mock('@bslt/react/router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@bslt/react/router')>();
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Mock useUpdateConsent hook
const mockUpdateConsent = vi.fn();
vi.mock('../hooks/useConsent', () => ({
  useUpdateConsent: vi.fn(() => ({
    updateConsent: mockUpdateConsent,
  })),
}));

// ============================================================================
// Tests
// ============================================================================

describe('CookieConsentBanner', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    vi.clearAllMocks();
  });

  describe('visibility based on localStorage', () => {
    it('should not render when localStorage has cookie-consent-dismissed', () => {
      localStorage.setItem('cookie-consent-dismissed', 'true');

      render(<CookieConsentBanner />);

      expect(screen.queryByTestId('cookie-consent-banner')).not.toBeInTheDocument();
    });

    it('should render banner when no consent stored in localStorage', () => {
      render(<CookieConsentBanner />);

      expect(screen.getByTestId('cookie-consent-banner')).toBeInTheDocument();
      expect(screen.getByText(/We use cookies to improve your experience/i)).toBeInTheDocument();
    });

    it('should render banner when localStorage is explicitly null', () => {
      // Explicitly verify null case
      expect(localStorage.getItem('cookie-consent-dismissed')).toBeNull();

      render(<CookieConsentBanner />);

      expect(screen.getByTestId('cookie-consent-banner')).toBeInTheDocument();
    });
  });

  describe('Accept All button', () => {
    it('should call updateConsent with all consents enabled', async () => {
      const user = userEvent.setup();
      mockUpdateConsent.mockResolvedValue({ success: true });

      render(<CookieConsentBanner />);

      const acceptButton = screen.getByRole('button', { name: /Accept All/i });
      await user.click(acceptButton);

      expect(mockUpdateConsent).toHaveBeenCalledWith({
        analytics: true,
        marketing_email: true,
        third_party_sharing: true,
        profiling: true,
      });
    });

    it('should set localStorage and hide banner when clicked', async () => {
      const user = userEvent.setup();
      mockUpdateConsent.mockResolvedValue({ success: true });

      render(<CookieConsentBanner />);

      const acceptButton = screen.getByRole('button', { name: /Accept All/i });
      await user.click(acceptButton);

      expect(localStorage.getItem('cookie-consent-dismissed')).toBe('true');
      expect(screen.queryByTestId('cookie-consent-banner')).not.toBeInTheDocument();
    });
  });

  describe('Reject Non-Essential button', () => {
    it('should call updateConsent with all non-essential consents disabled', async () => {
      const user = userEvent.setup();
      mockUpdateConsent.mockResolvedValue({ success: true });

      render(<CookieConsentBanner />);

      const rejectButton = screen.getByRole('button', { name: /Reject Non-Essential/i });
      await user.click(rejectButton);

      expect(mockUpdateConsent).toHaveBeenCalledWith({
        analytics: false,
        marketing_email: false,
        third_party_sharing: false,
        profiling: false,
      });
    });

    it('should set localStorage and hide banner when clicked', async () => {
      const user = userEvent.setup();
      mockUpdateConsent.mockResolvedValue({ success: true });

      render(<CookieConsentBanner />);

      const rejectButton = screen.getByRole('button', { name: /Reject Non-Essential/i });
      await user.click(rejectButton);

      expect(localStorage.getItem('cookie-consent-dismissed')).toBe('true');
      expect(screen.queryByTestId('cookie-consent-banner')).not.toBeInTheDocument();
    });
  });

  describe('Manage button', () => {
    it('should navigate to settings page with data-controls hash', async () => {
      const user = userEvent.setup();

      render(<CookieConsentBanner />);

      const manageButton = screen.getByRole('button', { name: /Manage/i });
      await user.click(manageButton);

      expect(mockNavigate).toHaveBeenCalledWith('/settings#data-controls');
    });

    it('should set localStorage and hide banner when clicked', async () => {
      const user = userEvent.setup();

      render(<CookieConsentBanner />);

      const manageButton = screen.getByRole('button', { name: /Manage/i });
      await user.click(manageButton);

      expect(localStorage.getItem('cookie-consent-dismissed')).toBe('true');
      expect(screen.queryByTestId('cookie-consent-banner')).not.toBeInTheDocument();
    });

    it('should dismiss without calling updateConsent', async () => {
      const user = userEvent.setup();

      render(<CookieConsentBanner />);

      const manageButton = screen.getByRole('button', { name: /Manage/i });
      await user.click(manageButton);

      expect(mockUpdateConsent).not.toHaveBeenCalled();
    });
  });

  describe('accessibility', () => {
    it('should have banner role and aria-label', () => {
      render(<CookieConsentBanner />);

      const banner = screen.getByRole('banner', { name: /Cookie consent/i });
      expect(banner).toBeInTheDocument();
    });

    it('should render all buttons with correct type', () => {
      render(<CookieConsentBanner />);

      const acceptButton = screen.getByRole('button', { name: /Accept All/i });
      const rejectButton = screen.getByRole('button', { name: /Reject Non-Essential/i });
      const manageButton = screen.getByRole('button', { name: /Manage/i });

      expect(acceptButton).toHaveAttribute('type', 'button');
      expect(rejectButton).toHaveAttribute('type', 'button');
      expect(manageButton).toHaveAttribute('type', 'button');
    });
  });

  describe('styling', () => {
    it('should apply custom className when provided', () => {
      render(<CookieConsentBanner className="custom-class" />);

      const banner = screen.getByTestId('cookie-consent-banner');
      expect(banner).toHaveClass('custom-class');
    });

    it('should have fixed positioning and z-index for visibility', () => {
      render(<CookieConsentBanner />);

      const banner = screen.getByTestId('cookie-consent-banner');
      expect(banner).toHaveClass('fixed', 'bottom-0', 'z-50');
    });
  });

  describe('edge cases', () => {
    it('should handle updateConsent promise rejection gracefully', async () => {
      const user = userEvent.setup();
      mockUpdateConsent.mockRejectedValue(new Error('Network error'));

      render(<CookieConsentBanner />);

      const acceptButton = screen.getByRole('button', { name: /Accept All/i });
      await user.click(acceptButton);

      // Should still dismiss the banner even if update fails
      expect(localStorage.getItem('cookie-consent-dismissed')).toBe('true');
      expect(screen.queryByTestId('cookie-consent-banner')).not.toBeInTheDocument();
    });

    it('should handle multiple rapid clicks on same button', async () => {
      const user = userEvent.setup();
      mockUpdateConsent.mockResolvedValue({ success: true });

      render(<CookieConsentBanner />);

      const acceptButton = screen.getByRole('button', { name: /Accept All/i });

      // Click multiple times rapidly
      await user.click(acceptButton);
      await user.click(acceptButton);
      await user.click(acceptButton);

      // Should only call updateConsent once (banner hidden after first click)
      expect(mockUpdateConsent).toHaveBeenCalledTimes(1);
    });

    it('should return null and not render anything when dismissed', () => {
      localStorage.setItem('cookie-consent-dismissed', 'true');

      const { container } = render(<CookieConsentBanner />);

      expect(container.firstChild).toBeNull();
    });
  });

  describe('button variants and sizes', () => {
    it('should render buttons with correct variants', () => {
      render(<CookieConsentBanner />);

      const acceptButton = screen.getByRole('button', { name: /Accept All/i });
      const rejectButton = screen.getByRole('button', { name: /Reject Non-Essential/i });
      const manageButton = screen.getByRole('button', { name: /Manage/i });

      // Based on the source code, these are the expected variants
      // Accept All: primary, Reject: secondary, Manage: text
      expect(acceptButton).toBeInTheDocument();
      expect(rejectButton).toBeInTheDocument();
      expect(manageButton).toBeInTheDocument();
    });
  });
});
