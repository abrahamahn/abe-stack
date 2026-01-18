// apps/web/src/features/auth/pages/Login.tsx
import {
  Button,
  Card,
  Heading,
  Input,
  PageContainer,
  PasswordInput,
  Text,
  useHistoryNav,
} from '@abe-stack/ui';
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
        <div className="grid gap-3">
          <Heading as="h1" size="lg">
            Login
          </Heading>

          <form
            onSubmit={(e) => {
              void handleLogin(e);
            }}
            className="grid gap-3"
          >
            <div>
              <label htmlFor="email" className="block mb-2">
                Email
              </label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={handleEmailChange}
                placeholder="you@example.com"
                required
                className="w-full"
              />
            </div>

            <PasswordInput
              id="password"
              label="Password"
              value={password}
              onChange={handlePasswordChange}
              placeholder="••••••••"
              required
              showToggle
            />

            {error && <Text tone="danger">{error}</Text>}

            <Button type="submit" disabled={isLoading} className="w-full mb-2">
              {isLoading ? 'Logging in...' : 'Login'}
            </Button>

            <Button
              type="button"
              variant="secondary"
              disabled={!canGoBack}
              onClick={goBack}
              className="w-full"
            >
              Back
            </Button>
          </form>
        </div>
      </Card>

      <Text tone="muted" className="text-center text-sm">
        Don't have an account? <a href="/register">Register</a>
      </Text>
    </PageContainer>
  );
}
