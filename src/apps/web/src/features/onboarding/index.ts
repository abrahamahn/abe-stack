// src/apps/web/src/features/onboarding/index.ts
/**
 * Onboarding Feature
 *
 * Multi-step onboarding wizard for new users.
 * Guides users through workspace creation and team invitations.
 */

// Components
export { OnboardingWizard, type OnboardingWizardProps } from './components/OnboardingWizard';

// Hooks
export {
  TOTAL_STEPS,
  useOnboarding,
  type OnboardingFormData,
  type OnboardingStep,
  type UseOnboardingResult,
} from './hooks/useOnboarding';

// Pages
export { OnboardingPage } from './pages/OnboardingPage';
