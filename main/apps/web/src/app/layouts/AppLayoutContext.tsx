// main/apps/web/src/app/layouts/AppLayoutContext.tsx
import { createContext, useContext, useEffect } from 'react';

import type { ReactNode } from 'react';

interface AppLayoutContextValue {
  setRightSidebar: (content: ReactNode | null) => void;
}

export const AppLayoutContext = createContext<AppLayoutContextValue | null>(null);

/**
 * Hook for child pages to inject content into AppLayout's right sidebar.
 * Content must be memoized (useMemo) to avoid infinite re-render loops.
 * Automatically clears content when the component unmounts.
 */
export function useAppRightSidebar(content: ReactNode): void {
  const ctx = useContext(AppLayoutContext);

  useEffect(() => {
    if (ctx === null) return;
    ctx.setRightSidebar(content);
    return (): void => {
      ctx.setRightSidebar(null);
    };
  }, [ctx, content]);
}
