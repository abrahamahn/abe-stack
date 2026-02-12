// src/apps/web/src/pages/ForbiddenPage.tsx
import { useNavigate } from '@abe-stack/react/router';
import { EmptyState, PageContainer } from '@abe-stack/ui';

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
