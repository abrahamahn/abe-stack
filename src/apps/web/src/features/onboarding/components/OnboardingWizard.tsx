// src/apps/web/src/features/onboarding/components/OnboardingWizard.tsx
/**
 * Onboarding Wizard Component
 *
 * A multi-step wizard that guides new users through initial setup:
 * 1. Create your workspace (workspace name input)
 * 2. Invite your team (email input, optional)
 * 3. You're all set! (success message with CTA)
 */

import { Button, Card, Heading, Input, Text } from '@abe-stack/ui';

import type { UseOnboardingResult } from '../hooks';
import type { ReactElement } from 'react';

// ============================================================================
// Types
// ============================================================================

export interface OnboardingWizardProps {
  /** Onboarding state and actions from useOnboarding hook */
  onboarding: UseOnboardingResult;
  /** Callback when onboarding is finished (e.g., navigate to dashboard) */
  onFinish: () => void;
}

// ============================================================================
// Step Components
// ============================================================================

function StepIndicator({
  currentStep,
  totalSteps,
}: {
  currentStep: number;
  totalSteps: number;
}): ReactElement {
  return (
    <div
      className="flex items-center justify-center gap-2"
      style={{ marginBottom: 'var(--ui-gap-lg)' }}
    >
      {Array.from({ length: totalSteps }, (_, i) => {
        const stepNumber = i + 1;
        const isActive = stepNumber === currentStep;
        const isCompleted = stepNumber < currentStep;

        return (
          <div
            key={stepNumber}
            style={{
              width: '2rem',
              height: '2rem',
              borderRadius: 'var(--ui-radius-full)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 'var(--ui-font-size-sm)',
              fontWeight: 'var(--ui-font-weight-semibold)',
              backgroundColor: isActive
                ? 'var(--ui-color-primary)'
                : isCompleted
                  ? 'var(--ui-color-success)'
                  : 'var(--ui-color-surface-strong)',
              color:
                isActive || isCompleted
                  ? 'var(--ui-color-text-inverse)'
                  : 'var(--ui-color-text-muted)',
              transition: `all var(--ui-motion-duration-base)`,
            }}
            aria-current={isActive ? 'step' : undefined}
            aria-label={`Step ${String(stepNumber)} of ${String(totalSteps)}`}
          >
            {isCompleted ? '\u2713' : String(stepNumber)}
          </div>
        );
      })}
      <Text size="sm" tone="muted" style={{ marginLeft: 'var(--ui-gap-sm)' }}>
        {String(currentStep)}/{String(totalSteps)}
      </Text>
    </div>
  );
}

function StepCreateWorkspace({
  workspaceName,
  onNameChange,
}: {
  workspaceName: string;
  onNameChange: (name: string) => void;
}): ReactElement {
  return (
    <div className="space-y-4">
      <Heading as="h2" size="lg" className="text-center">
        Create your workspace
      </Heading>
      <Text tone="muted" className="text-center">
        Give your workspace a name to get started. You can always change this later.
      </Text>
      <div>
        <label htmlFor="workspace-name">
          <Text
            size="sm"
            style={{
              fontWeight: 'var(--ui-font-weight-medium)',
              marginBottom: 'var(--ui-gap-xs)',
              display: 'block',
            }}
          >
            Workspace Name
          </Text>
        </label>
        <Input
          id="workspace-name"
          type="text"
          placeholder="My Workspace"
          value={workspaceName}
          onChange={(e) => {
            onNameChange(e.target.value);
          }}
          aria-label="Workspace name"
        />
      </div>
    </div>
  );
}

function StepInviteTeam({
  inviteEmail,
  onEmailChange,
}: {
  inviteEmail: string;
  onEmailChange: (email: string) => void;
}): ReactElement {
  return (
    <div className="space-y-4">
      <Heading as="h2" size="lg" className="text-center">
        Invite your team
      </Heading>
      <Text tone="muted" className="text-center">
        Add a team member by email. This step is optional -- you can invite people later.
      </Text>
      <div>
        <label htmlFor="invite-email">
          <Text
            size="sm"
            style={{
              fontWeight: 'var(--ui-font-weight-medium)',
              marginBottom: 'var(--ui-gap-xs)',
              display: 'block',
            }}
          >
            Team Member Email
          </Text>
        </label>
        <Input
          id="invite-email"
          type="email"
          placeholder="colleague@example.com"
          value={inviteEmail}
          onChange={(e) => {
            onEmailChange(e.target.value);
          }}
          aria-label="Team member email"
        />
      </div>
    </div>
  );
}

function StepComplete(): ReactElement {
  return (
    <div className="space-y-4 text-center">
      <div
        style={{
          fontSize: 'var(--ui-font-size-xl)',
          marginBottom: 'var(--ui-gap-sm)',
        }}
        aria-hidden="true"
      >
        {'\u2705'}
      </div>
      <Heading as="h2" size="lg">
        You are all set!
      </Heading>
      <Text tone="muted">Your workspace is ready. Head to your dashboard to start exploring.</Text>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function OnboardingWizard({ onboarding, onFinish }: OnboardingWizardProps): ReactElement {
  const {
    currentStep,
    totalSteps,
    formData,
    updateField,
    nextStep,
    prevStep,
    skipStep,
    completeOnboarding,
    isFirstStep,
    isLastStep,
  } = onboarding;

  const handleFinish = (): void => {
    completeOnboarding();
    onFinish();
  };

  return (
    <Card
      style={{
        maxWidth: '28rem',
        width: '100%',
        padding: 'var(--ui-gap-xl)',
      }}
    >
      <StepIndicator currentStep={currentStep} totalSteps={totalSteps} />

      {currentStep === 1 && (
        <StepCreateWorkspace
          workspaceName={formData.workspaceName}
          onNameChange={(name) => {
            updateField('workspaceName', name);
          }}
        />
      )}

      {currentStep === 2 && (
        <StepInviteTeam
          inviteEmail={formData.inviteEmail}
          onEmailChange={(email) => {
            updateField('inviteEmail', email);
          }}
        />
      )}

      {currentStep === 3 && <StepComplete />}

      <div className="flex justify-between" style={{ marginTop: 'var(--ui-gap-xl)' }}>
        <div>
          {!isFirstStep && !isLastStep && (
            <Button type="button" variant="text" onClick={prevStep}>
              Back
            </Button>
          )}
        </div>

        <div className="flex gap-2">
          {currentStep === 2 && (
            <Button type="button" variant="text" onClick={skipStep}>
              Skip
            </Button>
          )}

          {isLastStep ? (
            <Button type="button" onClick={handleFinish}>
              Go to Dashboard
            </Button>
          ) : (
            <Button type="button" onClick={nextStep}>
              Next
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}
