// src/apps/web/src/pages/NotFoundPage.tsx
import { useNavigate } from '@abe-stack/react/router';
import { EmptyState, PageContainer } from '@abe-stack/ui';

import type { ReactElement } from 'react';

export const NotFoundPage = (): ReactElement => {
  const navigate = useNavigate();

  return (
    <PageContainer>
      <EmptyState
        title="Page not found"
        description="The page you're looking for doesn't exist or has been moved."
        action={{
          label: 'Go to Home',
          onClick: () => {
            navigate('/');
          },
        }}
      />
    </PageContainer>
  );
};
