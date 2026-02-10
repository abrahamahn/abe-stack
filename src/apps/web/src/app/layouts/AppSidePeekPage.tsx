// src/apps/web/src/app/layouts/AppSidePeekPage.tsx
import { Heading, PageContainer, useNavigate } from '@abe-stack/ui';
import { SidePeekUILibraryContent } from '@ui-library/components';

import type { ReactElement } from 'react';

export const AppSidePeekPage = (): ReactElement => {
  const navigate = useNavigate();

  return (
    <div className="h-screen overflow-auto">
      <PageContainer>
        <div className="space-y-4">
          <Heading as="h1" size="lg">
            Side Peek UI Library
          </Heading>
          <button
            type="button"
            onClick={() => {
              navigate('/ui-library');
            }}
          >
            Back to UI Library
          </button>
          <SidePeekUILibraryContent />
        </div>
      </PageContainer>
    </div>
  );
};
