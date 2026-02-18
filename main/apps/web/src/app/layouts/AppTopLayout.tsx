// main/apps/web/src/app/layouts/AppTopLayout.tsx
import { getAccessToken } from '@app/authToken';
import { toastStore } from '@bslt/react';
import { useSidePeek, type AuthMode } from '@bslt/react/hooks';
import { Button, Heading, ResizablePanel, Skeleton, Text } from '@bslt/ui';
import { TenantSwitcher } from '@features/workspace/components';

import { AppUndoRedo } from './AppUndoRedo';

import type { ReactElement } from 'react';

/** Props for the AppTopLayout component. */
export interface AppTopLayoutProps {
  /** Current panel size percentage */
  size: number;
  /** Whether the top bar is visible */
  visible: boolean;
  /** Callback when panel is resized via drag */
  onResize: (size: number) => void;
  /** Whether auth state is still being resolved */
  isAuthLoading: boolean;
  /** Whether the user is authenticated */
  isAuthenticated: boolean;
  /** Current user info (identifier for display) */
  user: {
    email?: string;
    username?: string;
    firstName?: string;
    lastName?: string;
    id?: string;
  } | null;
  /** Logout handler */
  onLogout: () => Promise<void>;
  /** Open auth modal in login or register mode */
  onOpenAuthModal: (mode: AuthMode) => void;
}

/**
 * Top bar panel for the application.
 * Contains SidePeek toggle on the left, heading in center, and auth controls on the right.
 *
 * @param props - AppTopLayoutProps
 * @returns Resizable top bar panel element
 * @complexity O(1) - constant render cost
 */
export const AppTopLayout = ({
  size,
  visible,
  onResize,
  isAuthLoading,
  isAuthenticated,
  user,
  onLogout,
  onOpenAuthModal,
}: AppTopLayoutProps): ReactElement => {
  const { toggle, isOpen } = useSidePeek();

  const getEmailFromToken = (): string | null => {
    const token = getAccessToken();
    if (typeof token !== 'string' || token.length === 0) {
      return null;
    }

    const parts = token.split('.');
    const payloadPart = parts[1];
    if (payloadPart === undefined || payloadPart.length === 0) {
      return null;
    }

    try {
      const base64 = payloadPart.replace(/-/g, '+').replace(/_/g, '/');
      if (typeof atob !== 'function') {
        return null;
      }
      const decoded = atob(base64);
      const payload = JSON.parse(decoded) as { email?: unknown };
      return typeof payload.email === 'string' && payload.email.trim().length > 0
        ? payload.email
        : null;
    } catch {
      return null;
    }
  };

  const tokenEmail = getEmailFromToken();
  const userIdentifierCandidates = [
    user?.email,
    tokenEmail,
    user?.username,
    user?.firstName,
    user?.id,
  ];

  const userIdentifier =
    userIdentifierCandidates.find(
      (value): value is string => typeof value === 'string' && value.trim().length > 0,
    ) ?? 'Account';

  return (
    <ResizablePanel
      size={size}
      minSize={6}
      maxSize={20}
      direction="vertical"
      collapsed={!visible}
      onResize={onResize}
      className="border-b overflow-hidden"
      data-testid="app-top-panel"
    >
      <div className="bar relative flex items-center px-2 py-1 h-full min-h-0">
        <span className="layout-label absolute top-0 left-0 p-1 text-[8px] opacity-20 pointer-events-none">
          TopbarLayout
        </span>
        <div className="flex-shrink-0 flex items-center gap-2">
          <Button
            variant={isOpen ? 'primary' : 'secondary'}
            size="small"
            onClick={() => {
              toggle('/side-peek-ui-library');
            }}
            aria-label="Toggle side peek UI library"
          >
            <span className="flex items-center gap-2">
              <span aria-hidden className="text-base">
                {isOpen ? '✕' : '🪟'}
              </span>
              <Text as="span">{isOpen ? 'Close Peek' : 'Side Peek'}</Text>
            </span>
          </Button>
          {isAuthenticated && <AppUndoRedo />}
        </div>
        <div className="flex-1 flex-center">
          <Heading as="h1" size="lg" className="m-0">
            BSLT
          </Heading>
        </div>
        <div className="w-auto min-w-88 flex items-center gap-2 justify-end">
          {isAuthLoading ? (
            <>
              <Skeleton width={140} height={16} radius={4} className="hide-mobile" />
              <Skeleton width={56} height={28} radius={6} />
            </>
          ) : isAuthenticated ? (
            <>
              <TenantSwitcher className="hide-mobile" />
              <Text size="sm" tone="muted" className="hide-mobile">
                {userIdentifier}
              </Text>
              <Button
                variant="text"
                size="small"
                onClick={() => {
                  void onLogout().catch((error: unknown) => {
                    toastStore.getState().show({
                      title: 'Logout failed',
                      description: error instanceof Error ? error.message : 'Unable to log out',
                    });
                  });
                }}
              >
                Logout
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="text"
                size="small"
                onClick={() => {
                  onOpenAuthModal('login');
                }}
              >
                Login
              </Button>
              <Button
                variant="primary"
                size="small"
                onClick={() => {
                  onOpenAuthModal('register');
                }}
              >
                Register
              </Button>
            </>
          )}
        </div>
      </div>
    </ResizablePanel>
  );
};
