import { Container } from './Container';

import type { ReactElement, ReactNode } from 'react';

type StackedLayoutProps = {
  hero?: ReactNode;
  children: ReactNode;
};

export function StackedLayout({ hero, children }: StackedLayoutProps): ReactElement {
  return (
    <div style={{ padding: '48px 0' }}>
      <Container size="md">
        {hero ? <div style={{ marginBottom: '32px' }}>{hero}</div> : null}
        <div>{children}</div>
      </Container>
    </div>
  );
}
