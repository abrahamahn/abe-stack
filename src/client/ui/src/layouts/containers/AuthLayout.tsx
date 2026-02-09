// src/client/ui/src/layouts/containers/AuthLayout.tsx
import { Container } from '@containers/Container';
import '../../styles/layouts.css';

import type { ReactElement, ReactNode } from 'react';

type AuthLayoutProps = {
  title?: ReactNode;
  description?: ReactNode;
  children: ReactNode;
};

export const AuthLayout = ({ title, description, children }: AuthLayoutProps): ReactElement => {
  return (
    <div className="auth-layout">
      <Container size="sm">
        <div className="auth-layout-card">
          {title !== undefined && title !== null ? (
            <h1 className="auth-layout-title">{title}</h1>
          ) : null}
          {description !== undefined && description !== null ? (
            <p className="auth-layout-description">{description}</p>
          ) : null}
          {children}
        </div>
      </Container>
    </div>
  );
};
