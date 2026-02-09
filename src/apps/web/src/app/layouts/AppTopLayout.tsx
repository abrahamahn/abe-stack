// src/apps/web/src/app/layouts/AppTopLayout.tsx
import { toastStore } from '@abe-stack/react';
import { Button, Heading, ResizablePanel, Text, useLocation, useSidePeek } from '@abe-stack/ui';
import { useMemo, type ReactElement } from 'react';

import type { AuthMode } from '@abe-stack/ui';

/** Props for the AppTopLayout component. */
export interface AppTopLayoutProps {
  /** Current panel size percentage */
  size: number;
  /** Whether the top bar is visible */
  visible: boolean;
  /** Callback when panel is resized via drag */
  onResize: (size: number) => void;
  /** Whether the user is authenticated */
  isAuthenticated: boolean;
  /** Current user info (email for display) */
  user: { email?: string } | null;
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
  isAuthenticated,
  user,
  onLogout,
  onOpenAuthModal,
}: AppTopLayoutProps): ReactElement => {
  const { toggle, isOpen } = useSidePeek();
  const { pathname } = useLocation();
  const pageTitle = useMemo((): string => {
    if (pathname === '/' || pathname === '/clean') return 'ABE Stack Home';
    if (pathname.startsWith('/ui-library') || pathname.startsWith('/side-peek-ui-library')) {
      return 'ABE Stack UI Library';
    }
    if (pathname.startsWith('/dashboard')) return 'ABE Stack Dashboard';
    if (pathname.startsWith('/settings')) return 'ABE Stack Settings';
    if (
      pathname === '/auth' ||
      pathname === '/login' ||
      pathname === '/register' ||
      pathname.startsWith('/auth/')
    ) {
      return 'ABE Stack Auth';
    }
    if (pathname.startsWith('/admin')) return 'ABE Stack Admin';
    if (pathname.startsWith('/billing') || pathname.startsWith('/pricing'))
      return 'ABE Stack Billing';
    return 'ABE Stack';
  }, [pathname]);

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
              <span>{isOpen ? 'Close Peek' : 'Side Peek'}</span>
            </span>
          </Button>
        </div>
        <div className="flex-1 flex-center">
          <Heading as="h1" size="lg" className="m-0">
            {pageTitle}
          </Heading>
        </div>
        <div className="w-auto min-w-88 flex items-center gap-2 justify-end">
          {isAuthenticated ? (
            <>
              <Text size="sm" tone="muted" className="hide-mobile">
                {user?.email}
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
