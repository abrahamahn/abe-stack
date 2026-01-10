// packages/ui/src/hooks/useHistoryNav.tsx
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

type HistoryEntry = string;

export type HistoryContextValue = {
  history: HistoryEntry[];
  index: number;
  canGoBack: boolean;
  canGoForward: boolean;
  goBack: () => void;
  goForward: () => void;
};

type LocationState = {
  fromRedirect?: boolean;
};

const HistoryContext = createContext<HistoryContextValue | null>(null);

export function HistoryProvider({ children }: { children: ReactNode }): React.ReactElement {
  const navigate = useNavigate();
  const location = useLocation();
  const locationState = (location.state ?? null) as LocationState | null;
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [index, setIndex] = useState<number>(-1);
  const indexRef = useRef<number>(-1);

  // Track location changes and push onto our own history stack.
  useEffect(() => {
    const currentPath = `${location.pathname}${location.search}${location.hash}`;
    const isRedirectLanding = locationState?.fromRedirect === true;

    setHistory((prev) => {
      if (indexRef.current >= 0 && prev[indexRef.current] === currentPath) {
        return prev;
      }
      const next = prev.slice(0, indexRef.current + 1);
      next.push(currentPath);
      indexRef.current = next.length - 1;
      setIndex(indexRef.current);
      return next;
    });

    if (isRedirectLanding) {
      // ensure the previous entry is retained so back works
      void navigate(currentPath, { replace: true, state: { fromRedirect: false } });
    }
  }, [location.pathname, location.search, location.hash, locationState, navigate]);

  const canGoBack = index > 0;
  const canGoForward = index >= 0 && index < history.length - 1;

  const goBack = useCallback(() => {
    if (!canGoBack) return;
    const nextIndex = Math.max(0, indexRef.current - 1);
    indexRef.current = nextIndex;
    setIndex(nextIndex);
    void navigate(-1);
  }, [canGoBack, navigate]);

  const goForward = useCallback(() => {
    if (!canGoForward) return;
    const nextIndex = Math.min(history.length - 1, indexRef.current + 1);
    indexRef.current = nextIndex;
    setIndex(nextIndex);
    void navigate(1);
  }, [canGoForward, navigate, history.length]);

  const value = useMemo(
    () => ({
      history,
      index,
      canGoBack,
      canGoForward,
      goBack,
      goForward,
    }),
    [canGoBack, canGoForward, goBack, goForward, history, index],
  );

  return <HistoryContext.Provider value={value}>{children}</HistoryContext.Provider>;
}

export function useHistoryNav(): HistoryContextValue {
  const ctx = useContext(HistoryContext);
  if (!ctx) throw new Error('useHistoryNav must be used within HistoryProvider');
  return ctx;
}
