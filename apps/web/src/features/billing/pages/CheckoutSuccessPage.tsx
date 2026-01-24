// apps/web/src/features/billing/pages/CheckoutSuccessPage.tsx
/**
 * CheckoutSuccessPage - Displayed after successful checkout.
 */

import { Button, Card, PageContainer } from '@abe-stack/ui';
import { useNavigate } from '@abe-stack/ui';
import { useEffect, useState } from 'react';

import type { ReactElement } from 'react';

// ============================================================================
// Component
// ============================================================================

export function CheckoutSuccessPage(): ReactElement {
  const navigate = useNavigate();
  const [countdown, setCountdown] = useState(5);

  // Auto-redirect after 5 seconds
  useEffect(() => {
    if (countdown <= 0) {
      navigate('/settings/billing');
      return;
    }

    const timer = setTimeout(() => {
      setCountdown((c) => c - 1);
    }, 1000);

    return (): void => {
      clearTimeout(timer);
    };
  }, [countdown, navigate]);

  return (
    <PageContainer className="checkout-result-page">
      <Card className="checkout-result-page__card checkout-result-page__card--success">
        <Card.Body>
          <div className="checkout-result-page__icon checkout-result-page__icon--success">
            {'\u2713'}
          </div>
          <h1 className="checkout-result-page__title">Payment Successful!</h1>
          <p className="checkout-result-page__message">
            Thank you for subscribing. Your account has been upgraded and you now have access to all
            premium features.
          </p>
          <p className="checkout-result-page__countdown">
            Redirecting to billing settings in {countdown} seconds...
          </p>
          <div className="checkout-result-page__actions">
            <Button
              onClick={() => {
                navigate('/settings/billing');
              }}
            >
              Go to Billing Settings
            </Button>
            <Button
              variant="text"
              onClick={() => {
                navigate('/dashboard');
              }}
            >
              Go to Dashboard
            </Button>
          </div>
        </Card.Body>
      </Card>
    </PageContainer>
  );
}
