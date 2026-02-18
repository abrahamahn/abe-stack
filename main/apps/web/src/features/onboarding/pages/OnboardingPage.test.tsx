// main/apps/web/src/features/onboarding/pages/OnboardingPage.test.tsx
import { screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderWithProviders } from '../../../__tests__/utils';

import { OnboardingPage } from './OnboardingPage';

// Mock useNavigate
const mockNavigate = vi.fn();

vi.mock('@bslt/ui', async () => {
  const actual = await vi.importActual('@bslt/ui');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useLocalStorage: () => [false, vi.fn()],
  };
});

describe('OnboardingPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render the onboarding wizard', () => {
    renderWithProviders(<OnboardingPage />);
    expect(screen.getByRole('heading', { name: /create your workspace/i })).toBeInTheDocument();
  });

  it('should render the step indicator', () => {
    renderWithProviders(<OnboardingPage />);
    expect(screen.getByText('1/3')).toBeInTheDocument();
  });

  it('should render the workspace name input', () => {
    renderWithProviders(<OnboardingPage />);
    expect(screen.getByLabelText(/workspace name/i)).toBeInTheDocument();
  });

  it('should render the Next button', () => {
    renderWithProviders(<OnboardingPage />);
    expect(screen.getByRole('button', { name: /next/i })).toBeInTheDocument();
  });
});
