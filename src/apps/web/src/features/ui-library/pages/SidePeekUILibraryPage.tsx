// apps/web/src/features/ui-library/pages/SidePeekUILibraryPage.tsx
import { Heading, PageContainer, useNavigate } from '@abe-stack/ui';
import { SidePeekUILibraryContent } from '@ui-library/components';

import type { ReactElement } from 'react';

export const SidePeekUILibraryPage = (): ReactElement => {
  const navigate = useNavigate();

  return (
    <div className="h-screen overflow-auto">
      <PageContainer>
        <div className="space-y-4">
          <Heading as="h1" size="lg">
            Side Peek UI Library
          </Heading>
          <SidePeekUILibraryContent
            actionLabel="Back to UI Library"
            onAction={() => {
              navigate('/ui-library');
            }}
          />
        </div>
      </PageContainer>
    </div>
  );
};
