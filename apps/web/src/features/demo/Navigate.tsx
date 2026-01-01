import { Button, PageContainer } from '@abe-stack/ui';
import React, { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';

import { useHistoryNav } from '../../contexts/HistoryContext';

import { UIPage } from './UI';

type DemoView = 'ui';

export const Navigate: React.FC = () => {
  const location = useLocation();
  const { goBack, canGoBack } = useHistoryNav();

  const initialView = useMemo<DemoView>(() => 'ui', [location.pathname]);

  const [view, setView] = useState<DemoView>(initialView);

  useEffect(() => {
    setView(initialView);
  }, [initialView]);

  const renderView = (): React.ReactElement => {
    switch (view) {
      default:
        return <UIPage />;
    }
  };

  return (
    <PageContainer>
      <section style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
        <Button variant="secondary" onClick={goBack} disabled={!canGoBack}>
          Back
        </Button>
        <Button
          variant="primary"
          onClick={() => {
            setView('ui');
          }}
        >
          UI
        </Button>
      </section>

      {renderView()}
    </PageContainer>
  );
};
