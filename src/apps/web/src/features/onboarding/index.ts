// src/apps/web/src/features/onboarding/index.ts
/**
 * Onboarding Feature
 *
 * Multi-step onboarding wizard for new users.
 * Guides users through workspace creation and team invitations.
 */

// Components
// Components
export { OnboardingWizard } from './components/OnboardingWizard';
export type { OnboardingWizardProps } from './components/OnboardingWizard';

// Hooks
export { TOTAL_STEPS, useOnboarding } from './hooks/useOnboarding';
export type {
  OnboardingFormData,
  OnboardingStep,
  UseOnboardingResult,
} from './hooks/useOnboarding';

// Pages
export { OnboardingPage } from './pages/OnboardingPage';
