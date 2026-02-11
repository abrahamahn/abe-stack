// src/apps/web/src/features/onboarding/components/OnboardingWizard.test.tsx
import { screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderWithProviders } from '../../../__tests__/utils';

import { OnboardingWizard } from './OnboardingWizard';

import type { UseOnboardingResult } from '../hooks';

// ============================================================================
// Mock Onboarding State Factory
// ============================================================================

function createMockOnboarding(overrides?: Partial<UseOnboardingResult>): UseOnboardingResult {
  return {
    currentStep: 1,
    totalSteps: 3,
    isCompleted: false,
    formData: { workspaceName: '', inviteEmail: '' },
    updateField: vi.fn(),
    nextStep: vi.fn(),
    prevStep: vi.fn(),
    skipStep: vi.fn(),
    completeOnboarding: vi.fn(),
    resetOnboarding: vi.fn(),
    isFirstStep: true,
    isLastStep: false,
    ...overrides,
  };
}

describe('OnboardingWizard', () => {
  const mockOnFinish = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Step 1 - Create Workspace', () => {
    it('should render workspace creation heading', () => {
      const onboarding = createMockOnboarding({ currentStep: 1 });
      renderWithProviders(<OnboardingWizard onboarding={onboarding} onFinish={mockOnFinish} />);
      expect(screen.getByRole('heading', { name: /create your workspace/i })).toBeInTheDocument();
    });

    it('should render workspace name input', () => {
      const onboarding = createMockOnboarding({ currentStep: 1 });
      renderWithProviders(<OnboardingWizard onboarding={onboarding} onFinish={mockOnFinish} />);
      expect(screen.getByLabelText(/workspace name/i)).toBeInTheDocument();
    });

    it('should render Next button', () => {
      const onboarding = createMockOnboarding({ currentStep: 1 });
      renderWithProviders(<OnboardingWizard onboarding={onboarding} onFinish={mockOnFinish} />);
      expect(screen.getByRole('button', { name: /next/i })).toBeInTheDocument();
    });

    it('should not render Back button on first step', () => {
      const onboarding = createMockOnboarding({ currentStep: 1, isFirstStep: true });
      renderWithProviders(<OnboardingWizard onboarding={onboarding} onFinish={mockOnFinish} />);
      expect(screen.queryByRole('button', { name: /back/i })).not.toBeInTheDocument();
    });

    it('should call nextStep when Next is clicked', async () => {
      const onboarding = createMockOnboarding({ currentStep: 1 });
      const { user } = renderWithProviders(
        <OnboardingWizard onboarding={onboarding} onFinish={mockOnFinish} />,
      );
      await user.click(screen.getByRole('button', { name: /next/i }));
      expect(onboarding.nextStep).toHaveBeenCalled();
    });

    it('should call updateField when typing workspace name', async () => {
      const onboarding = createMockOnboarding({ currentStep: 1 });
      const { user } = renderWithProviders(
        <OnboardingWizard onboarding={onboarding} onFinish={mockOnFinish} />,
      );
      await user.type(screen.getByLabelText(/workspace name/i), 'A');
      expect(onboarding.updateField).toHaveBeenCalled();
    });

    it('should render step indicator showing 1/3', () => {
      const onboarding = createMockOnboarding({ currentStep: 1 });
      renderWithProviders(<OnboardingWizard onboarding={onboarding} onFinish={mockOnFinish} />);
      expect(screen.getByText('1/3')).toBeInTheDocument();
    });
  });

  describe('Step 2 - Invite Team', () => {
    it('should render invite heading', () => {
      const onboarding = createMockOnboarding({ currentStep: 2, isFirstStep: false });
      renderWithProviders(<OnboardingWizard onboarding={onboarding} onFinish={mockOnFinish} />);
      expect(screen.getByRole('heading', { name: /invite your team/i })).toBeInTheDocument();
    });

    it('should render email input', () => {
      const onboarding = createMockOnboarding({ currentStep: 2, isFirstStep: false });
      renderWithProviders(<OnboardingWizard onboarding={onboarding} onFinish={mockOnFinish} />);
      expect(screen.getByLabelText(/team member email/i)).toBeInTheDocument();
    });

    it('should render Back button', () => {
      const onboarding = createMockOnboarding({ currentStep: 2, isFirstStep: false });
      renderWithProviders(<OnboardingWizard onboarding={onboarding} onFinish={mockOnFinish} />);
      expect(screen.getByRole('button', { name: /back/i })).toBeInTheDocument();
    });

    it('should render Skip button', () => {
      const onboarding = createMockOnboarding({ currentStep: 2, isFirstStep: false });
      renderWithProviders(<OnboardingWizard onboarding={onboarding} onFinish={mockOnFinish} />);
      expect(screen.getByRole('button', { name: /skip/i })).toBeInTheDocument();
    });

    it('should call prevStep when Back is clicked', async () => {
      const onboarding = createMockOnboarding({ currentStep: 2, isFirstStep: false });
      const { user } = renderWithProviders(
        <OnboardingWizard onboarding={onboarding} onFinish={mockOnFinish} />,
      );
      await user.click(screen.getByRole('button', { name: /back/i }));
      expect(onboarding.prevStep).toHaveBeenCalled();
    });

    it('should call skipStep when Skip is clicked', async () => {
      const onboarding = createMockOnboarding({ currentStep: 2, isFirstStep: false });
      const { user } = renderWithProviders(
        <OnboardingWizard onboarding={onboarding} onFinish={mockOnFinish} />,
      );
      await user.click(screen.getByRole('button', { name: /skip/i }));
      expect(onboarding.skipStep).toHaveBeenCalled();
    });

    it('should render step indicator showing 2/3', () => {
      const onboarding = createMockOnboarding({ currentStep: 2, isFirstStep: false });
      renderWithProviders(<OnboardingWizard onboarding={onboarding} onFinish={mockOnFinish} />);
      expect(screen.getByText('2/3')).toBeInTheDocument();
    });
  });

  describe('Step 3 - Completion', () => {
    it('should render completion heading', () => {
      const onboarding = createMockOnboarding({
        currentStep: 3,
        isFirstStep: false,
        isLastStep: true,
      });
      renderWithProviders(<OnboardingWizard onboarding={onboarding} onFinish={mockOnFinish} />);
      expect(screen.getByRole('heading', { name: /you are all set/i })).toBeInTheDocument();
    });

    it('should render Go to Dashboard button', () => {
      const onboarding = createMockOnboarding({
        currentStep: 3,
        isFirstStep: false,
        isLastStep: true,
      });
      renderWithProviders(<OnboardingWizard onboarding={onboarding} onFinish={mockOnFinish} />);
      expect(screen.getByRole('button', { name: /go to dashboard/i })).toBeInTheDocument();
    });

    it('should not render Next button on last step', () => {
      const onboarding = createMockOnboarding({
        currentStep: 3,
        isFirstStep: false,
        isLastStep: true,
      });
      renderWithProviders(<OnboardingWizard onboarding={onboarding} onFinish={mockOnFinish} />);
      expect(screen.queryByRole('button', { name: /^next$/i })).not.toBeInTheDocument();
    });

    it('should call completeOnboarding and onFinish when Go to Dashboard is clicked', async () => {
      const onboarding = createMockOnboarding({
        currentStep: 3,
        isFirstStep: false,
        isLastStep: true,
      });
      const { user } = renderWithProviders(
        <OnboardingWizard onboarding={onboarding} onFinish={mockOnFinish} />,
      );
      await user.click(screen.getByRole('button', { name: /go to dashboard/i }));
      expect(onboarding.completeOnboarding).toHaveBeenCalled();
      expect(mockOnFinish).toHaveBeenCalled();
    });

    it('should render step indicator showing 3/3', () => {
      const onboarding = createMockOnboarding({
        currentStep: 3,
        isFirstStep: false,
        isLastStep: true,
      });
      renderWithProviders(<OnboardingWizard onboarding={onboarding} onFinish={mockOnFinish} />);
      expect(screen.getByText('3/3')).toBeInTheDocument();
    });

    it('should render success message', () => {
      const onboarding = createMockOnboarding({
        currentStep: 3,
        isFirstStep: false,
        isLastStep: true,
      });
      renderWithProviders(<OnboardingWizard onboarding={onboarding} onFinish={mockOnFinish} />);
      expect(screen.getByText(/workspace is ready/i)).toBeInTheDocument();
    });
  });

  describe('Step Indicator', () => {
    it('should render step indicators for all 3 steps', () => {
      const onboarding = createMockOnboarding({ currentStep: 1 });
      renderWithProviders(<OnboardingWizard onboarding={onboarding} onFinish={mockOnFinish} />);
      expect(screen.getByLabelText('Step 1 of 3')).toBeInTheDocument();
      expect(screen.getByLabelText('Step 2 of 3')).toBeInTheDocument();
      expect(screen.getByLabelText('Step 3 of 3')).toBeInTheDocument();
    });

    it('should mark current step with aria-current', () => {
      const onboarding = createMockOnboarding({ currentStep: 2, isFirstStep: false });
      renderWithProviders(<OnboardingWizard onboarding={onboarding} onFinish={mockOnFinish} />);
      const step2 = screen.getByLabelText('Step 2 of 3');
      expect(step2).toHaveAttribute('aria-current', 'step');
      const step1 = screen.getByLabelText('Step 1 of 3');
      expect(step1).not.toHaveAttribute('aria-current');
    });
  });
});
