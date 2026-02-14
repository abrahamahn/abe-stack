// main/apps/web/src/features/onboarding/hooks/useOnboarding.ts
/**
 * Onboarding Hook
 *
 * Manages step state and completion status for the onboarding wizard.
 * Uses localStorage to persist completion flag so users don't see the wizard again.
 */

import { useLocalStorage } from '@abe-stack/react/hooks';
import { useCallback, useState } from 'react';

// ============================================================================
// Types
// ============================================================================

export type OnboardingStep = 1 | 2 | 3;

export const TOTAL_STEPS = 3;

export interface OnboardingFormData {
  /** Workspace name entered in step 1 */
  workspaceName: string;
  /** Email for inviting a team member in step 2 */
  inviteEmail: string;
}

export interface UseOnboardingResult {
  /** Current step (1, 2, or 3) */
  currentStep: OnboardingStep;
  /** Total number of steps */
  totalSteps: number;
  /** Whether onboarding has been completed previously */
  isCompleted: boolean;
  /** Form data collected across steps */
  formData: OnboardingFormData;
  /** Update a form field */
  updateField: <K extends keyof OnboardingFormData>(field: K, value: OnboardingFormData[K]) => void;
  /** Go to the next step */
  nextStep: () => void;
  /** Go to the previous step */
  prevStep: () => void;
  /** Skip the current step and move forward */
  skipStep: () => void;
  /** Mark onboarding as completed */
  completeOnboarding: () => void;
  /** Reset onboarding state (for testing or re-onboarding) */
  resetOnboarding: () => void;
  /** Whether the user is on the first step */
  isFirstStep: boolean;
  /** Whether the user is on the last step */
  isLastStep: boolean;
}

// ============================================================================
// Constants
// ============================================================================

const ONBOARDING_COMPLETED_KEY = 'onboarding-completed';

// ============================================================================
// Hook
// ============================================================================

export function useOnboarding(): UseOnboardingResult {
  const [isCompleted, setIsCompleted] = useLocalStorage<boolean>(ONBOARDING_COMPLETED_KEY, false);
  const [currentStep, setCurrentStep] = useState<OnboardingStep>(1);
  const [formData, setFormData] = useState<OnboardingFormData>({
    workspaceName: '',
    inviteEmail: '',
  });

  const isFirstStep = currentStep === 1;
  const isLastStep = currentStep === TOTAL_STEPS;

  const updateField = useCallback(
    <K extends keyof OnboardingFormData>(field: K, value: OnboardingFormData[K]): void => {
      setFormData((prev) => ({ ...prev, [field]: value }));
    },
    [],
  );

  const nextStep = useCallback((): void => {
    setCurrentStep((prev) => {
      if (prev >= TOTAL_STEPS) return prev;
      return (prev + 1) as OnboardingStep;
    });
  }, []);

  const prevStep = useCallback((): void => {
    setCurrentStep((prev) => {
      if (prev <= 1) return prev;
      return (prev - 1) as OnboardingStep;
    });
  }, []);

  const skipStep = useCallback((): void => {
    nextStep();
  }, [nextStep]);

  const completeOnboarding = useCallback((): void => {
    setIsCompleted(true);
  }, [setIsCompleted]);

  const resetOnboarding = useCallback((): void => {
    setIsCompleted(false);
    setCurrentStep(1);
    setFormData({ workspaceName: '', inviteEmail: '' });
  }, [setIsCompleted]);

  return {
    currentStep,
    totalSteps: TOTAL_STEPS,
    isCompleted,
    formData,
    updateField,
    nextStep,
    prevStep,
    skipStep,
    completeOnboarding,
    resetOnboarding,
    isFirstStep,
    isLastStep,
  };
}
