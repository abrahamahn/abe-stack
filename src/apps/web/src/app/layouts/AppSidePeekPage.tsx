// src/apps/web/src/app/layouts/AppSidePeekPage.tsx
import { Button, Heading, PageContainer, useNavigate } from '@abe-stack/ui';
import { SidePeekUILibraryContent } from '@ui-library/components/SidePeekUILibraryContent';

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
          <Button
            type="button"
            variant="text"
            onClick={() => {
              navigate('/ui-library');
            }}
          >
            Back to UI Library
          </Button>
          <SidePeekUILibraryContent />
        </div>
      </PageContainer>
    </div>
  );
};
