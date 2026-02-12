// src/apps/web/src/features/billing/pages/CheckoutSuccessPage.tsx
/**
 * CheckoutSuccessPage - Displayed after successful checkout.
 */

import { MS_PER_SECOND } from '@abe-stack/shared';
import { Button, Card, Heading, PageContainer, Text, useNavigate } from '@abe-stack/ui';
import { useEffect, useState } from 'react';

import type { ReactElement } from 'react';

// ============================================================================
// Component
// ============================================================================

export const CheckoutSuccessPage = (): ReactElement => {
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
    }, MS_PER_SECOND);

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
          <Heading as="h1" className="checkout-result-page__title">
            Payment Successful!
          </Heading>
          <Text className="checkout-result-page__message">
            Thank you for subscribing. Your account has been upgraded and you now have access to all
            premium features.
          </Text>
          <Text className="checkout-result-page__countdown">
            Redirecting to billing settings in {countdown} seconds...
          </Text>
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
};
