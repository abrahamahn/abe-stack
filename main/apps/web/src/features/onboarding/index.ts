// main/apps/web/src/features/onboarding/index.ts
/**
 * Onboarding Feature
 *
 * Multi-step onboarding wizard for new users.
 * Guides users through workspace creation and team invitations.
 */

// Components
export { OnboardingWizard } from './components';
export type { OnboardingWizardProps } from './components';

// Hooks
export { TOTAL_STEPS, useOnboarding } from './hooks';
export type { OnboardingFormData, OnboardingStep, UseOnboardingResult } from './hooks';

// Pages
export { OnboardingPage } from './pages';
