// main/apps/web/src/features/auth/components/OAuthButtons.tsx
/**
 * OAuth Buttons Component
 *
 * Displays OAuth provider buttons for social login/registration.
 * Only shows buttons for enabled providers.
 */

import { useClientEnvironment } from '@app/ClientEnvironment';
import { getOAuthLoginUrl, useEnabledAuthStrategies, useEnabledOAuthProviders } from '@bslt/react';
import { AuthFormLayout, OAuthButton, Text } from '@bslt/ui';
import { useMemo } from 'react';

import type { ReactElement } from 'react';

// ============================================================================
// Local Types (for ESLint type resolution)
// ============================================================================

type OAuthProviderLocal = 'google' | 'github' | 'apple';

// ============================================================================
// Provider Icons (inline SVG for reliability)
// ============================================================================

const GoogleIcon = (): ReactElement => (
  <svg className="oauth-button-icon" viewBox="0 0 24 24" aria-hidden="true">
    <path
      fill="#4285F4"
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
    />
    <path
      fill="#34A853"
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
    />
    <path
      fill="#FBBC05"
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
    />
    <path
      fill="#EA4335"
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
    />
  </svg>
);

const GitHubIcon = (): ReactElement => (
  <svg className="oauth-button-icon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z" />
  </svg>
);

const AppleIcon = (): ReactElement => (
  <svg className="oauth-button-icon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
  </svg>
);

// ============================================================================
// Provider Config
// ============================================================================

const PROVIDER_CONFIG: Record<OAuthProviderLocal, { label: string; icon: () => ReactElement }> = {
  google: { label: 'Google', icon: GoogleIcon },
  github: { label: 'GitHub', icon: GitHubIcon },
  apple: { label: 'Apple', icon: AppleIcon },
};

// ============================================================================
// Types
// ============================================================================

export interface OAuthButtonsProps {
  /** Text to show on buttons - "Continue with" for login, "Sign up with" for register */
  mode?: 'login' | 'register';
  /** Disable buttons during form submission */
  disabled?: boolean;
}

// ============================================================================
// Component
// ============================================================================

export const OAuthButtons = ({
  mode = 'login',
  disabled,
}: OAuthButtonsProps): ReactElement | null => {
  const { config } = useClientEnvironment();

  const clientConfig = useMemo(
    () => ({
      baseUrl: config.apiUrl,
    }),
    [config.apiUrl],
  );

  const oauthState = useEnabledOAuthProviders(clientConfig);
  const strategyState = useEnabledAuthStrategies(clientConfig);
  const providers = Array.isArray(oauthState.providers) ? oauthState.providers : [];
  const isLoading = oauthState.isLoading;
  const error = oauthState.error;
  const disabledOAuthStrategies = strategyState.disabled.filter(
    (strategy): strategy is OAuthProviderLocal => strategy in PROVIDER_CONFIG,
  );

  // Don't render anything if no provider data is available.
  if (
    (!isLoading && providers.length === 0 && disabledOAuthStrategies.length === 0) ||
    error !== null
  ) {
    return null;
  }

  const actionText = mode === 'register' ? 'Sign up with' : 'Continue with';

  const handleOAuthClick = (provider: OAuthProviderLocal): void => {
    const url = getOAuthLoginUrl(config.apiUrl, provider);
    window.location.assign(url);
  };

  return (
    <>
      {/* OAuth Buttons */}
      <div className="oauth-buttons">
        {isLoading ? (
          // Loading skeleton
          <OAuthButton disabled className="opacity-50">
            Loading providers...
          </OAuthButton>
        ) : (
          (providers as OAuthProviderLocal[]).map((provider: OAuthProviderLocal) => {
            const providerConfig: { label: string; icon: () => ReactElement } =
              PROVIDER_CONFIG[provider];
            const { label, icon: IconComponent } = providerConfig;
            return (
              <OAuthButton
                key={provider}
                type="button"
                onClick={() => {
                  handleOAuthClick(provider);
                }}
                disabled={disabled}
              >
                <IconComponent />
                <Text as="span">
                  {actionText} {label}
                </Text>
              </OAuthButton>
            );
          })
        )}
      </div>

      {!isLoading && disabledOAuthStrategies.length > 0 && (
        <Text size="xs" tone="muted" className="text-center">
          Disabled: {disabledOAuthStrategies.map((p) => PROVIDER_CONFIG[p].label).join(', ')}
        </Text>
      )}

      {/* Divider */}
      {!isLoading && providers.length > 0 && <AuthFormLayout.Divider>or</AuthFormLayout.Divider>}
    </>
  );
};
