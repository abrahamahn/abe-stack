// src/apps/web/src/features/auth/components/TurnstileWidget.tsx
/**
 * Cloudflare Turnstile CAPTCHA Widget
 *
 * Invisible Turnstile widget that obtains a CAPTCHA token for form submissions.
 * Only renders when VITE_CAPTCHA_ENABLED=true and VITE_CAPTCHA_SITE_KEY is set.
 *
 * @module auth/components
 */

import { useCallback, useEffect, useRef, type ReactElement } from 'react';

// ============================================================================
// Types
// ============================================================================

export interface TurnstileWidgetProps {
  /** Called when a CAPTCHA token is obtained */
  onToken: (token: string) => void;
  /** Called when CAPTCHA verification fails */
  onError?: () => void;
  /** Called when the token expires */
  onExpire?: () => void;
}

/** Turnstile render options */
interface TurnstileRenderOptions {
  sitekey: string;
  callback: (token: string) => void;
  'error-callback'?: () => void;
  'expired-callback'?: () => void;
  size?: 'invisible' | 'normal' | 'compact';
  theme?: 'light' | 'dark' | 'auto';
}

/** Turnstile global object injected by the script */
interface TurnstileApi {
  render: (container: HTMLElement, options: TurnstileRenderOptions) => string;
  reset: (widgetId: string) => void;
  remove: (widgetId: string) => void;
}

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

// ============================================================================
// Config
// ============================================================================

const CAPTCHA_ENABLED = import.meta.env['VITE_CAPTCHA_ENABLED'] === 'true';
const CAPTCHA_SITE_KEY =
  typeof import.meta.env['VITE_CAPTCHA_SITE_KEY'] === 'string'
    ? import.meta.env['VITE_CAPTCHA_SITE_KEY']
    : '';

const TURNSTILE_SCRIPT_URL = 'https://challenges.cloudflare.com/turnstile/v0/api.js';

// ============================================================================
// Script Loader
// ============================================================================

let scriptLoaded = false;
let scriptLoading = false;

function loadTurnstileScript(): Promise<void> {
  if (scriptLoaded) return Promise.resolve();
  if (scriptLoading) {
    return new Promise((resolve) => {
      const check = (): void => {
        if (scriptLoaded) {
          resolve();
        } else {
          setTimeout(check, 50);
        }
      };
      check();
    });
  }

  scriptLoading = true;
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = TURNSTILE_SCRIPT_URL;
    script.async = true;
    script.onload = (): void => {
      scriptLoaded = true;
      scriptLoading = false;
      resolve();
    };
    script.onerror = (): void => {
      scriptLoading = false;
      reject(new Error('Failed to load Turnstile script'));
    };
    document.head.appendChild(script);
  });
}

// ============================================================================
// Component
// ============================================================================

/**
 * Cloudflare Turnstile CAPTCHA widget.
 *
 * Loads the Turnstile script on mount, renders an invisible widget,
 * and passes the obtained token to the parent via onToken callback.
 *
 * Only active when VITE_CAPTCHA_ENABLED=true and VITE_CAPTCHA_SITE_KEY is set.
 */
export function TurnstileWidget({
  onToken,
  onError,
  onExpire,
}: TurnstileWidgetProps): ReactElement | null {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);

  const handleToken = useCallback(
    (token: string): void => {
      onToken(token);
    },
    [onToken],
  );

  useEffect(() => {
    if (!CAPTCHA_ENABLED || CAPTCHA_SITE_KEY === '') return;

    let mounted = true;

    const init = async (): Promise<void> => {
      try {
        await loadTurnstileScript();
      } catch {
        onError?.();
        return;
      }

      if (!mounted || containerRef.current === null || window.turnstile === undefined) return;

      const renderOptions: TurnstileRenderOptions = {
        sitekey: CAPTCHA_SITE_KEY,
        callback: handleToken,
        size: 'invisible',
        theme: 'auto',
      };
      if (onError !== undefined) {
        renderOptions['error-callback'] = onError;
      }
      if (onExpire !== undefined) {
        renderOptions['expired-callback'] = onExpire;
      }
      widgetIdRef.current = window.turnstile.render(containerRef.current, renderOptions);
    };

    void init();

    return (): void => {
      mounted = false;
      if (widgetIdRef.current !== null && window.turnstile !== undefined) {
        window.turnstile.remove(widgetIdRef.current);
        widgetIdRef.current = null;
      }
    };
  }, [handleToken, onError, onExpire]);

  // Don't render anything if CAPTCHA is disabled
  if (!CAPTCHA_ENABLED || CAPTCHA_SITE_KEY === '') {
    return null;
  }

  return <div ref={containerRef} />;
}
