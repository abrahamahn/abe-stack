import { Container } from './Container';
import './layouts.css';

import type { ReactElement, ReactNode } from 'react';

type AuthLayoutProps = {
  title?: ReactNode;
  description?: ReactNode;
  children: ReactNode;
};

export function AuthLayout({ title, description, children }: AuthLayoutProps): ReactElement {
  return (
    <div className="ui-auth-layout">
      <Container size="sm">
        <div className="ui-auth-layout-card">
          {title ? <h1 className="ui-auth-layout-title">{title}</h1> : null}
          {description ? <p className="ui-auth-layout-description">{description}</p> : null}
          {children}
        </div>
      </Container>
    </div>
  );
}
