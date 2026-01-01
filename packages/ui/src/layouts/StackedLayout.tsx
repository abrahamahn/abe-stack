import { Container } from './Container';
import './layouts.css';

import type { ReactElement, ReactNode } from 'react';

type StackedLayoutProps = {
  hero?: ReactNode;
  children: ReactNode;
};

export function StackedLayout({ hero, children }: StackedLayoutProps): ReactElement {
  return (
    <div className="ui-stacked-layout">
      <Container size="md">
        {hero ? <div className="ui-stacked-layout-hero">{hero}</div> : null}
        <div className="ui-stacked-layout-body">{children}</div>
      </Container>
    </div>
  );
}
