import { Button } from '@abe-stack/ui';
import { Link } from 'react-router-dom';

import { useAuth } from '../hooks/useAuth';

import type { JSX } from 'react';

export function HomePage(): JSX.Element {
  const { isAuthenticated, user } = useAuth();

  return (
    <div style={{ maxWidth: '800px', margin: '50px auto', padding: '20px' }}>
      <h1>Welcome to ABE Stack</h1>

      <p style={{ fontSize: '18px', lineHeight: '1.6', marginTop: '20px' }}>
        A minimal, ground-up full-stack TypeScript monorepo with authentication.
      </p>

      {isAuthenticated ? (
        <div style={{ marginTop: '30px' }}>
          <p>Welcome back, {user?.email}!</p>
          <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
            <Link to="/dashboard">
              <Button>Go to Dashboard</Button>
            </Link>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: '10px', marginTop: '30px' }}>
          <Link to="/login">
            <Button>Login</Button>
          </Link>
        </div>
      )}

      <div style={{ marginTop: '40px', fontSize: '14px', color: '#666' }}>
        <h3>Tech Stack:</h3>
        <ul>
          <li>Database: PostgreSQL + Drizzle ORM</li>
          <li>Backend: Fastify + TypeScript</li>
          <li>Frontend: React 19 + Vite</li>
          <li>Auth: JWT + bcrypt</li>
          <li>Validation: Zod</li>
        </ul>
      </div>
    </div>
  );
}
