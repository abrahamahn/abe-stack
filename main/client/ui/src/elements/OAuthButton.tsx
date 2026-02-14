// main/client/ui/src/elements/OAuthButton.tsx
import { forwardRef, type ComponentPropsWithoutRef } from 'react';

import '../styles/elements.css';

type OAuthButtonProps = ComponentPropsWithoutRef<'button'>;

/**
 * A styled OAuth button for social auth providers.
 *
 * @example
 * ```tsx
 * <OAuthButton>
 *   <GoogleIcon />
 *   Continue with Google
 * </OAuthButton>
 * ```
 */
export const OAuthButton = forwardRef<HTMLButtonElement, OAuthButtonProps>((props, ref) => {
  const { className = '', type = 'button', ...rest } = props;
  return <button ref={ref} type={type} className={`oauth-button ${className}`.trim()} {...rest} />;
});

OAuthButton.displayName = 'OAuthButton';

export type { OAuthButtonProps };
