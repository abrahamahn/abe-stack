import { Button, Card, Heading, PageContainer, Text } from '@abe-stack/ui';

import type { JSX } from 'react';

export type DemoView = 'home' | 'dashboard' | 'login' | 'gallery';

type HomeProps = {
  onNavigate?: (view: DemoView) => void;
};

export function HomePage({ onNavigate }: HomeProps): JSX.Element {
  return (
    <PageContainer>
      <section style={{ display: 'grid', gap: 12 }}>
        <Heading as="h1" size="xl">
          Welcome to ABE Stack
        </Heading>
        <Text style={{ fontSize: '16px' }}>
          A minimal, ground-up full-stack TypeScript monorepo with authentication.
        </Text>
      </section>

      <section style={{ display: 'flex', gap: '10px' }}>
        <Button onClick={() => onNavigate?.('login')}>Login</Button>
        <Button variant="secondary" onClick={() => onNavigate?.('dashboard')}>
          Dashboard
        </Button>
        <Button variant="secondary" onClick={() => onNavigate?.('gallery')}>
          Gallery
        </Button>
      </section>

      <Card>
        <div style={{ display: 'grid', gap: 6 }}>
          <Heading as="h3" size="md">
            Tech Stack
          </Heading>
          <ul
            style={{
              display: 'grid',
              gap: 4,
              paddingLeft: '16px',
              lineHeight: 1.4,
              fontSize: '14px',
            }}
          >
            <li>
              <Text tone="muted">Database: PostgreSQL + Drizzle ORM</Text>
            </li>
            <li>
              <Text tone="muted">Backend: Fastify + TypeScript</Text>
            </li>
            <li>
              <Text tone="muted">Frontend: React 19 + Vite</Text>
            </li>
            <li>
              <Text tone="muted">Auth: JWT + bcrypt</Text>
            </li>
            <li>
              <Text tone="muted">Validation: Zod</Text>
            </li>
          </ul>
        </div>
      </Card>
    </PageContainer>
  );
}
