// apps/web/src/features/demo/components/DemoTopBar.tsx
import { toastStore } from '@abe-stack/stores';
import { Button, Heading, ResizablePanel, Text, useNavigate, useSidePeek } from '@abe-stack/ui';

import type { AuthMode } from '@auth/components/AuthForms';
import type { ReactElement } from 'react';

export interface DemoTopBarProps {
  size: number;
  visible: boolean;
  onResize: (size: number) => void;
  isAuthenticated: boolean;
  user: { email?: string } | null;
  onLogout: () => Promise<void>;
  onOpenAuthModal: (mode: AuthMode) => void;
}

export function DemoTopBar({
  size,
  visible,
  onResize,
  isAuthenticated,
  user,
  onLogout,
  onOpenAuthModal,
}: DemoTopBarProps): ReactElement {
  const navigate = useNavigate();
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
      data-testid="demo-top-panel"
    >
      <div className="bar border-b relative">
        <span className="layout-label">TopbarLayout</span>
        <div className="min-w-88 flex items-center gap-2">
          <Button
            variant="text"
            size="small"
            onClick={() => {
              navigate('/');
            }}
            aria-label="Back to home"
          >
            ← Back
          </Button>
          <Button
            variant={isOpen ? 'primary' : 'secondary'}
            size="small"
            onClick={() => {
              toggle('/side-peek-demo');
            }}
            aria-label="Toggle side peek demo"
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
            ABE Stack UI Component Gallery
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
}
