// main/apps/web/src/features/auth/components/PasskeyLoginButton.tsx
/**
 * Passkey login button shown on the login page.
 * Only renders when WebAuthn is supported by the browser.
 */

import { useClientEnvironment } from '@app/ClientEnvironment';
import { useEnabledAuthStrategies } from '@bslt/react';
import { Button, Text } from '@bslt/ui';

import { useLoginWithPasskey } from '../hooks/useWebauthn';

import type { ReactElement } from 'react';

export interface PasskeyLoginButtonProps {
  onSuccess?: (() => void) | undefined;
  disabled?: boolean | undefined;
}

export function PasskeyLoginButton({
  onSuccess,
  disabled,
}: PasskeyLoginButtonProps): ReactElement | null {
  const { config } = useClientEnvironment();
  const strategyState = useEnabledAuthStrategies({ baseUrl: config.apiUrl });
  const { login, isLoading, error } = useLoginWithPasskey(onSuccess);

  // Only show when WebAuthn is available
  const isWebAuthnSupported = typeof window !== 'undefined' && 'PublicKeyCredential' in window;
  if (!isWebAuthnSupported) {
    return null;
  }

  const passkeyEnabled =
    strategyState.error !== null ||
    strategyState.isLoading ||
    strategyState.enabled.includes('webauthn');

  if (!passkeyEnabled) {
    return (
      <Text size="xs" tone="muted" className="text-center">
        Passkey sign-in is disabled.
      </Text>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <Button
        variant="secondary"
        className="w-full"
        onClick={() => {
          void login();
        }}
        disabled={disabled === true || isLoading}
      >
        {isLoading ? 'Verifying...' : 'Sign in with Passkey'}
      </Button>
      {error !== null && (
        <Text size="sm" className="text-danger text-center">
          {error}
        </Text>
      )}
    </div>
  );
}
