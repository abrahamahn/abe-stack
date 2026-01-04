import { Button, Card, Heading, PageContainer, Text } from '@abe-stack/ui';
import { Link } from 'react-router-dom';

import type { JSX } from 'react';

export function HomePage(): JSX.Element {
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
        <Link to="/login">
          <Button>Login</Button>
        </Link>
        <Link to="/dashboard">
          <Button variant="secondary">Dashboard</Button>
        </Link>
        <Link to="/features/demo">
          <Button variant="secondary">Demo</Button>
        </Link>
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
