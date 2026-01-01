import { Button, Card, Heading, PageContainer, Text } from '@abe-stack/ui';

import type { JSX } from 'react';

export type DemoView = 'home' | 'dashboard' | 'login' | 'gallery';

type HomeProps = {
  onNavigate?: (view: DemoView) => void;
};

export function HomePage({ onNavigate }: HomeProps): JSX.Element {
  return (
    <PageContainer>
      <section style={{ display: 'grid', gap: '16px' }}>
        <Heading as="h1" size="xl">
          Welcome to ABE Stack
        </Heading>
        <Text>A minimal, ground-up full-stack TypeScript monorepo with authentication.</Text>
      </section>

      <section style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
        <Button onClick={() => onNavigate?.('login')}>Login</Button>
        <Button variant="secondary" onClick={() => onNavigate?.('dashboard')}>
          Dashboard
        </Button>
        <Button variant="secondary" onClick={() => onNavigate?.('gallery')}>
          Gallery
        </Button>
      </section>

      <Card style={{ marginTop: '24px' }}>
        <Heading as="h3" size="md">
          Tech Stack
        </Heading>
        <ul style={{ paddingLeft: '20px' }}>
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
      </Card>
    </PageContainer>
  );
}
