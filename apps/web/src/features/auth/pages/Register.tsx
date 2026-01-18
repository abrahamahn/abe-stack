// apps/web/src/features/auth/pages/Register.tsx
import { useState } from 'react';

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

import type { ChangeEvent, FormEvent, JSX } from 'react';

export function RegisterPage(): JSX.Element {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const { register, isLoading } = useAuth();
  const { goBack, canGoBack } = useHistoryNav();

  const handleEmailChange = (event: ChangeEvent<HTMLInputElement>): void => {
    setEmail(event.target.value);
  };

  const handleNameChange = (event: ChangeEvent<HTMLInputElement>): void => {
    setName(event.target.value);
  };

  const handlePasswordChange = (event: ChangeEvent<HTMLInputElement>): void => {
    setPassword(event.target.value);
  };

  const handleConfirmPasswordChange = (event: ChangeEvent<HTMLInputElement>): void => {
    setConfirmPassword(event.target.value);
  };

  const handleRegister = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    try {
      await register({ email, password, name });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    }
  };

  return (
    <PageContainer maxWidth={440}>
      <Card>
        <div style={{ display: 'grid', gap: 12 }}>
          <Heading as="h1" size="lg">
            Create Account
          </Heading>

          <form
            onSubmit={(e) => {
              void handleRegister(e);
            }}
            style={{ display: 'grid', gap: 12 }}
          >
            <Input.Field
              id="name"
              label="Name"
              type="text"
              value={name}
              onChange={handleNameChange}
              placeholder="Your name"
            />

            <Input.Field
              id="email"
              label="Email"
              type="email"
              value={email}
              onChange={handleEmailChange}
              placeholder="you@example.com"
              required
            />

            <PasswordInput
              id="password"
              label="Password"
              value={password}
              onChange={handlePasswordChange}
              placeholder="Choose a strong password"
              required
              showStrength
              showToggle
              userInputs={[email, name]}
            />

            <PasswordInput
              id="confirmPassword"
              label="Confirm Password"
              value={confirmPassword}
              onChange={handleConfirmPasswordChange}
              placeholder="Repeat your password"
              required
              showToggle
              error={
                confirmPassword && password !== confirmPassword
                  ? 'Passwords do not match'
                  : undefined
              }
            />

            {error && <Text tone="danger">{error}</Text>}

            <Button
              type="submit"
              disabled={isLoading || password !== confirmPassword}
              style={{ width: '100%', marginTop: '8px' }}
            >
              {isLoading ? 'Creating account...' : 'Create Account'}
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
        Already have an account? <a href="/login">Login</a>
      </Text>
    </PageContainer>
  );
}
