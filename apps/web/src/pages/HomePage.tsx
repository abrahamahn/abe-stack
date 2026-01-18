// apps/web/src/pages/HomePage.tsx
import { Button, Card, Heading, PageContainer, Text } from '@abe-stack/ui';
import { Link } from 'react-router-dom';

import type { JSX } from 'react';

export function HomePage(): JSX.Element {
  return (
    <PageContainer>
      <section className="grid gap-3">
        <Heading as="h1" size="xl">
          Welcome to ABE Stack
        </Heading>
        <Text className="text-md">
          A minimal, ground-up full-stack TypeScript monorepo with authentication.
        </Text>
      </section>

      <section className="flex gap-2">
        <Link to="/login">
          <Button>Login</Button>
        </Link>
        <Link to="/dashboard">
          <Button variant="secondary">Dashboard</Button>
        </Link>
        <Link to="/demo">
          <Button variant="secondary">Demo</Button>
        </Link>
      </section>

      <Card>
        <div className="grid gap-2">
          <Heading as="h3" size="md">
            Tech Stack
          </Heading>
          <ul className="grid gap-1 pl-4 leading-normal text-sm">
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
