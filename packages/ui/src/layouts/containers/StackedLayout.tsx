// packages/ui/src/layouts/containers/StackedLayout.tsx
import { Container } from '@containers/Container';
import '../../styles/layouts.css';

import type { ReactElement, ReactNode } from 'react';

type StackedLayoutProps = {
  hero?: ReactNode;
  children: ReactNode;
};

export function StackedLayout({ hero, children }: StackedLayoutProps): ReactElement {
  return (
    <div className="stacked-layout">
      <Container size="md">
        {hero ? <div className="stacked-layout-hero">{hero}</div> : null}
        <div className="stacked-layout-body">{children}</div>
      </Container>
    </div>
  );
}
