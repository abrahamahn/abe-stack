// apps/web/src/features/auth/components/RegisterForm.test.tsx
import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { renderWithProviders } from './../../../__tests__/utils';
import { RegisterForm } from './RegisterForm';

// Mock SDK hooks
vi.mock('@abe-stack/engine', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@abe-stack/engine')>();
  return {
    ...actual,
    useEnabledOAuthProviders: () => ({
      providers: [],
      isLoading: false,
      error: null,
    }),
    getOAuthLoginUrl: (baseUrl: string, provider: string) => `${baseUrl}/auth/${provider}`,
  };
});

// Mock the useResendCooldown hook
vi.mock('@abe-stack/ui', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@abe-stack/ui')>();
  return {
    ...actual,
    useResendCooldown: () => ({
      cooldown: 0,
      isOnCooldown: false,
      startCooldown: vi.fn(),
    }),
  };
});

describe('RegisterForm', () => {
  it('should render', () => {
    renderWithProviders(<RegisterForm onRegister={vi.fn()} isLoading={false} error={null} />);
    expect(screen.getByRole('heading', { name: /create account/i })).toBeInTheDocument();
  });

  it('should render email input', () => {
    renderWithProviders(<RegisterForm onRegister={vi.fn()} isLoading={false} error={null} />);
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
  });

  it('should render password input', () => {
    renderWithProviders(<RegisterForm onRegister={vi.fn()} isLoading={false} error={null} />);
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
  });

  it('should render submit button', () => {
    renderWithProviders(<RegisterForm onRegister={vi.fn()} isLoading={false} error={null} />);
    expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument();
  });
});
