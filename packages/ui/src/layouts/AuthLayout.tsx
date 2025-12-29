import { Container } from './Container';

import type { ReactElement, ReactNode } from 'react';

type AuthLayoutProps = {
  title?: ReactNode;
  description?: ReactNode;
  children: ReactNode;
};

export function AuthLayout({ title, description, children }: AuthLayoutProps): ReactElement {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center' }}>
      <Container size="sm">
        <div
          style={{
            padding: '32px',
            borderRadius: '12px',
            border: '1px solid var(--gray3, #e5e7eb)',
            boxShadow: '0 4px 20px rgba(0,0,0,0.04)',
          }}
        >
          {title ? <h1 style={{ margin: 0, marginBottom: 8 }}>{title}</h1> : null}
          {description ? (
            <p style={{ margin: 0, marginBottom: 16, color: 'var(--gray7, #6b7280)' }}>
              {description}
            </p>
          ) : null}
          {children}
        </div>
      </Container>
    </div>
  );
}
