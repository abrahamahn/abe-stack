// apps/web/src/features/auth/pages/Login.tsx
import { Button, Card, Heading, Input, PageContainer, Text, useHistoryNav } from '@abe-stack/ui';
import { useAuth } from '@auth/hooks';
import { useState } from 'react';

import type { ChangeEvent, FormEvent, JSX } from 'react';

export function LoginPage(): JSX.Element {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login, isLoading } = useAuth();
  const { goBack, canGoBack } = useHistoryNav();

  const handleEmailChange = (event: ChangeEvent<HTMLInputElement>): void => {
    setEmail(event.target.value);
  };

  const handlePasswordChange = (event: ChangeEvent<HTMLInputElement>): void => {
    setPassword(event.target.value);
  };

  const handleLogin = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    setError('');
    try {
      await login({ email, password });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    }
  };

  return (
    <PageContainer maxWidth={440}>
      <Card>
        <div style={{ display: 'grid', gap: 12 }}>
          <Heading as="h1" size="lg">
            Login
          </Heading>

          <form
            onSubmit={(e) => {
              void handleLogin(e);
            }}
            style={{ display: 'grid', gap: 12 }}
          >
            <div>
              <label htmlFor="email" style={{ display: 'block', marginBottom: '6px' }}>
                Email
              </label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={handleEmailChange}
                placeholder="you@example.com"
                required
                style={{ width: '100%' }}
              />
            </div>

            <div>
              <label htmlFor="password" style={{ display: 'block', marginBottom: '6px' }}>
                Password
              </label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={handlePasswordChange}
                placeholder="••••••••"
                required
                style={{ width: '100%' }}
              />
            </div>

            {error && <Text tone="danger">{error}</Text>}

            <Button
              type="submit"
              disabled={isLoading}
              style={{ width: '100%', marginBottom: '8px' }}
            >
              {isLoading ? 'Logging in...' : 'Login'}
            </Button>

            <Button
              type="button"
              variant="secondary"
              disabled={!canGoBack}
              onClick={goBack}
              style={{ width: '100%' }}
            >
              Back
            </Button>
          </form>
        </div>
      </Card>

      <Text tone="muted" style={{ textAlign: 'center', fontSize: '14px' }}>
        Don't have an account? Register coming soon...
      </Text>
    </PageContainer>
  );
}
