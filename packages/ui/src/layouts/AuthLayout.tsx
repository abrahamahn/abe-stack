import { Container } from './Container';
import '../theme/theme.css';

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
            padding: 'calc(var(--ui-gap-lg) * 2)',
            borderRadius: 'var(--ui-radius-md)',
            border: '1px solid var(--ui-color-border)',
            boxShadow: 'var(--ui-color-shadow)',
          }}
        >
          {title ? <h1 style={{ margin: 0, marginBottom: 'var(--ui-gap-sm)' }}>{title}</h1> : null}
          {description ? (
            <p
              style={{
                margin: 0,
                marginBottom: 'var(--ui-gap-lg)',
                color: 'var(--ui-color-text-muted)',
              }}
            >
              {description}
            </p>
          ) : null}
          {children}
        </div>
      </Container>
    </div>
  );
}
