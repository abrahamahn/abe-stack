// apps/web/src/features/home/components/HomeTopBar.tsx
import { toastStore } from '@abe-stack/react';
import { Button, Heading, ResizablePanel, Text, useSidePeek } from '@abe-stack/ui';

import type { AuthMode } from '@abe-stack/ui';
import type { ReactElement } from 'react';

/** Props for the HomeTopBar component. */
export interface HomeTopBarProps {
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
 * Top bar panel for the Home page.
 * Contains SidePeek toggle on the left, heading in center, and auth controls on the right.
 *
 * @param props - HomeTopBarProps
 * @returns Resizable top bar panel element
 * @complexity O(1) - constant render cost
 */
export const HomeTopBar = ({
  size,
  visible,
  onResize,
  isAuthenticated,
  user,
  onLogout,
  onOpenAuthModal,
}: HomeTopBarProps): ReactElement => {
  const { toggle, isOpen } = useSidePeek();

  return (
    <ResizablePanel
      size={size}
      minSize={6}
      maxSize={20}
      direction="vertical"
      collapsed={!visible}
      onResize={onResize}
      className="border-b overflow-hidden"
      data-testid="home-top-panel"
    >
      <div className="bar border-b relative">
        <span className="layout-label">TopbarLayout</span>
        <div className="min-w-88 flex items-center gap-2">
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
            ABE Stack
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
