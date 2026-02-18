// main/apps/web/src/features/onboarding/pages/OnboardingPage.tsx
/**
 * Onboarding Page
 *
 * Full-page wrapper for the OnboardingWizard component.
 * Centers the wizard vertically and horizontally.
 */

import { useNavigate } from '@bslt/react/router';
import { PageContainer } from '@bslt/ui';

import { OnboardingWizard } from '../components/OnboardingWizard';
import { useOnboarding } from '../hooks/useOnboarding';

import type { ReactElement } from 'react';

export function OnboardingPage(): ReactElement {
  const onboarding = useOnboarding();
  const navigate = useNavigate();

  const handleFinish = (): void => {
    navigate('/dashboard');
  };

  return (
    <PageContainer>
      <div className="flex items-center justify-center" style={{ minHeight: '60vh' }}>
        <OnboardingWizard onboarding={onboarding} onFinish={handleFinish} />
      </div>
    </PageContainer>
  );
}
