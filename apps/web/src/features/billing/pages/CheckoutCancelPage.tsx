// apps/web/src/features/billing/pages/CheckoutCancelPage.tsx
/**
 * CheckoutCancelPage - Displayed after checkout is canceled.
 */

import { Button, Card, PageContainer } from '@abe-stack/ui';
import { useNavigate } from '@abe-stack/ui';

import type { ReactElement } from 'react';

// ============================================================================
// Component
// ============================================================================

export function CheckoutCancelPage(): ReactElement {
  const navigate = useNavigate();

  return (
    <PageContainer className="checkout-result-page">
      <Card className="checkout-result-page__card checkout-result-page__card--canceled">
        <Card.Body>
          <div className="checkout-result-page__icon checkout-result-page__icon--canceled">
            {'\u2717'}
          </div>
          <h1 className="checkout-result-page__title">Checkout Canceled</h1>
          <p className="checkout-result-page__message">
            Your checkout was canceled and you have not been charged. Feel free to try again when
            you&apos;re ready.
          </p>
          <div className="checkout-result-page__actions">
            <Button onClick={() => navigate('/pricing')}>
              Return to Pricing
            </Button>
            <Button variant="text" onClick={() => navigate('/')}>
              Go to Home
            </Button>
          </div>
        </Card.Body>
      </Card>
    </PageContainer>
  );
}
