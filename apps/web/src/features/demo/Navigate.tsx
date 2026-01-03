import { Button, PageContainer, useHistoryNav } from '@abe-stack/ui';
import React from 'react';

import { UIPage } from './UI';

export const Navigate: React.FC = () => {
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
};
