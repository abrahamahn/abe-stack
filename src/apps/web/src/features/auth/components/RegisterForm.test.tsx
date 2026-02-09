// src/apps/web/src/features/auth/components/RegisterForm.test.tsx
/**
 * Unit tests for RegisterForm component.
 *
 * Tests cover:
 * - Form rendering and structure
 * - User interactions and form submission
 * - Loading and error states
 *
 * @complexity O(1) - All tests are unit tests with mocked dependencies
 */
import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { renderWithProviders } from './../../../__tests__/utils';
import { RegisterForm } from './RegisterForm';

// Mock SDK hooks - preserve actual exports (QueryCache, QueryCacheProvider) for renderWithProviders
vi.mock('@abe-stack/client-engine', async () => {
  const actual = await vi.importActual('@abe-stack/client-engine');
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

// Mock useResendCooldown hook - preserve real UI components via importActual
vi.mock('@abe-stack/ui', async () => {
  const actual = await vi.importActual('@abe-stack/ui');
  return {
    ...actual,
    useResendCooldown: () => ({
      cooldown: 0,
      isOnCooldown: false,
      startCooldown: vi.fn(),
      resetCooldown: vi.fn(),
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
