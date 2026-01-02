import { Button, Card, Heading, PageContainer, Text } from '@abe-stack/ui';

import type { JSX } from 'react';

export type DemoView = 'home' | 'dashboard' | 'login' | 'gallery';

type HomeProps = {
  onNavigate?: (view: DemoView) => void;
};

// Runtime validation for DemoView
const VALID_VIEWS: readonly DemoView[] = ['home', 'dashboard', 'login', 'gallery'];

function isValidDemoView(view: string): view is DemoView {
  return VALID_VIEWS.includes(view as DemoView);
}

export function HomePage({ onNavigate }: HomeProps): JSX.Element {
  const handleNavigate = (view: DemoView): void => {
    // Runtime validation
    if (!isValidDemoView(view)) {
      const error = new Error(
        `Invalid view: ${String(view)}. Expected one of: ${VALID_VIEWS.join(', ')}`,
      );
      // eslint-disable-next-line no-console
      console.error('Navigation error:', error);
      throw error;
    }

    try {
      onNavigate?.(view);
    } catch (error) {
      // Error handling - log to error tracking service in production
      // eslint-disable-next-line no-console
      console.error('Navigation error:', error);
      // Don't re-throw - handle gracefully to prevent app crash
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent, view: DemoView): void => {
    // Handle Enter and Space keys for accessibility
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleNavigate(view);
    }
  };

  return (
    <PageContainer>
      <section style={{ display: 'grid', gap: '16px' }}>
        <Heading as="h1" size="xl">
          Welcome to ABE Stack
        </Heading>
        <Text>A minimal, ground-up full-stack TypeScript monorepo with authentication.</Text>
      </section>

      <section style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
        <Button
          onClick={() => {
            handleNavigate('login');
          }}
          onKeyDown={(e) => {
            handleKeyDown(e, 'login');
          }}
        >
          Login
        </Button>
        <Button
          variant="secondary"
          onClick={() => {
            handleNavigate('dashboard');
          }}
          onKeyDown={(e) => {
            handleKeyDown(e, 'dashboard');
          }}
        >
          Dashboard
        </Button>
        <Button
          variant="secondary"
          onClick={() => {
            handleNavigate('gallery');
          }}
          onKeyDown={(e) => {
            handleKeyDown(e, 'gallery');
          }}
        >
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
