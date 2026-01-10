import { Button, PageContainer, useHistoryNav } from '@ui';

import { UIPage } from './UI';

import type { ReactElement } from 'react';

export function Navigate(): ReactElement {
  const { goBack, canGoBack } = useHistoryNav();

  return (
    <PageContainer>
      <section style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
        <Button variant="secondary" onClick={goBack} disabled={!canGoBack}>
          Back
        </Button>
      </section>

      <UIPage />
    </PageContainer>
  );
}
