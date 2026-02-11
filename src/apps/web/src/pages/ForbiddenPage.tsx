// src/apps/web/src/pages/ForbiddenPage.tsx
import { EmptyState, PageContainer, useNavigate } from '@abe-stack/ui';

import type { ReactElement } from 'react';

export const ForbiddenPage = (): ReactElement => {
  const navigate = useNavigate();

  return (
    <PageContainer>
      <EmptyState
        title="Access denied"
        description="You don't have permission to view this page."
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
