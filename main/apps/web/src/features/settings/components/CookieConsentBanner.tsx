// main/apps/web/src/features/settings/components/CookieConsentBanner.tsx
/**
 * Cookie Consent Banner
 *
 * Fixed-bottom banner for cookie consent. Checks localStorage for dismissal.
 * Provides Accept All, Reject Non-Essential, and a link to manage preferences.
 */

import { useLocalStorageValue } from '@bslt/react/hooks';
import { useNavigate } from '@bslt/react/router';
import { Button, Text } from '@bslt/ui';
import { useCallback, type ReactElement } from 'react';

import { useUpdateConsent } from '../hooks/useConsent';

// ============================================================================
// Constants
// ============================================================================

const STORAGE_KEY = 'cookie-consent-dismissed';

// ============================================================================
// Types
// ============================================================================

export interface CookieConsentBannerProps {
  className?: string;
}

// ============================================================================
// Component
// ============================================================================

export const CookieConsentBanner = ({
  className,
}: CookieConsentBannerProps): ReactElement | null => {
  const [dismissed, setDismissed] = useLocalStorageValue(STORAGE_KEY);
  const navigate = useNavigate();
  const { updateConsent } = useUpdateConsent();
  const visible = dismissed !== 'true';

  const dismiss = useCallback(() => {
    setDismissed('true');
  }, [setDismissed]);

  const handleAcceptAll = useCallback(() => {
    void updateConsent({
      analytics: true,
      marketing_email: true,
      third_party_sharing: true,
      profiling: true,
    });
    dismiss();
  }, [updateConsent, dismiss]);

  const handleRejectNonEssential = useCallback(() => {
    void updateConsent({
      analytics: false,
      marketing_email: false,
      third_party_sharing: false,
      profiling: false,
    });
    dismiss();
  }, [updateConsent, dismiss]);

  const handleManage = useCallback(() => {
    dismiss();
    navigate('/settings#data-controls');
  }, [dismiss, navigate]);

  if (!visible) return null;

  return (
    <div
      className={`fixed bottom-0 left-0 right-0 bg-surface border-t p-4 flex items-center justify-between gap-4 z-50 ${className ?? ''}`}
      role="banner"
      aria-label="Cookie consent"
      data-testid="cookie-consent-banner"
    >
      <Text size="sm">
        We use cookies to improve your experience. You can manage your preferences at any time.
      </Text>
      <div className="flex gap-2 flex-shrink-0">
        <Button type="button" variant="text" size="small" onClick={handleManage}>
          Manage
        </Button>
        <Button type="button" variant="secondary" size="small" onClick={handleRejectNonEssential}>
          Reject Non-Essential
        </Button>
        <Button type="button" variant="primary" size="small" onClick={handleAcceptAll}>
          Accept All
        </Button>
      </div>
    </div>
  );
};
