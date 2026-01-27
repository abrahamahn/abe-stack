// apps/web/src/features/demo/pages/SidePeekDemoPage.tsx
import { Heading, PageContainer, useNavigate } from '@abe-stack/ui';
import { SidePeekDemoContent } from '@demo/components';

import type { ReactElement } from 'react';

export const SidePeekDemoPage = (): ReactElement => {
  const navigate = useNavigate();

  return (
    <div className="h-screen overflow-auto">
      <PageContainer>
        <div className="space-y-4">
          <Heading as="h1" size="lg">
            Side Peek Demo
          </Heading>
          <SidePeekDemoContent
            actionLabel="Back to demo"
            onAction={() => {
              navigate('/demo');
            }}
          />
        </div>
      </PageContainer>
    </div>
  );
};
