import { Container } from './Container';
import '../theme/theme.css';

import type { ReactElement, ReactNode } from 'react';

type StackedLayoutProps = {
  hero?: ReactNode;
  children: ReactNode;
};

export function StackedLayout({ hero, children }: StackedLayoutProps): ReactElement {
  return (
    <div style={{ padding: 'calc(var(--ui-gap-xl) * 2) 0' }}>
      <Container size="md">
        {hero ? <div style={{ marginBottom: 'calc(var(--ui-gap-lg) * 2)' }}>{hero}</div> : null}
        <div>{children}</div>
      </Container>
    </div>
  );
}
