// main/client/react/src/components/LiveRegion.tsx
import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
} from 'react';

/** Delay before setting text to force screen reader re-announcement */
const ANNOUNCE_DELAY_MS = 50;

/** Duration before auto-clearing announced text */
const ANNOUNCE_AUTO_CLEAR_MS = 7000;

/** Politeness level for screen reader announcements */
export type AnnouncePoliteness = 'polite' | 'assertive';

/**
 * Return value from the useAnnounce hook.
 *
 * @param announce - Function to announce a message to screen readers
 */
export interface UseAnnounceResult {
  /** Announce a message to screen readers via the nearest LiveRegion */
  announce: (message: string, politeness?: AnnouncePoliteness) => void;
}

type LiveRegionContextValue = {
  announce: (message: string, politeness?: AnnouncePoliteness) => void;
};

const LiveRegionContext = createContext<LiveRegionContextValue | null>(null);

/**
 * Props for the LiveRegion component.
 *
 * @param children - Child components that can use `useAnnounce`
 */
export type LiveRegionProps = {
  /** Child components that can use useAnnounce */
  children: ReactNode;
};

/**
 * Provides a screen reader announcement region for descendant components.
 *
 * Renders two visually-hidden `aria-live` regions: one for polite
 * announcements and one for assertive announcements. Descendant components
 * use the `useAnnounce` hook to trigger announcements programmatically.
 *
 * Uses a text-swap technique (clearing then setting) to ensure screen
 * readers re-announce messages, even if the same message is announced
 * consecutively.
 *
 * @param props - LiveRegion component props
 * @returns Provider wrapping children with hidden aria-live regions
 *
 * @example
 * ```tsx
 * <LiveRegion>
 *   <App />
 * </LiveRegion>
 *
 * // In a descendant component:
 * function SaveButton() {
 *   const { announce } = useAnnounce();
 *   const handleSave = () => {
 *     save();
 *     announce('Changes saved successfully');
 *   };
 *   return <button onClick={handleSave}>Save</button>;
 * }
 * ```
 */
export const LiveRegion = ({ children }: LiveRegionProps): ReactElement => {
  const [politeMessage, setPoliteMessage] = useState('');
  const [assertiveMessage, setAssertiveMessage] = useState('');
  const clearTimerRef = useRef<ReturnType<typeof globalThis.setTimeout> | null>(null);

  const announce = useCallback(
    (message: string, politeness: AnnouncePoliteness = 'polite'): void => {
      if (clearTimerRef.current !== null) {
        globalThis.clearTimeout(clearTimerRef.current);
      }

      const setter = politeness === 'assertive' ? setAssertiveMessage : setPoliteMessage;

      // Clear first, then set on next tick to force re-announcement
      setter('');
      globalThis.setTimeout(() => {
        setter(message);
      }, ANNOUNCE_DELAY_MS);

      // Auto-clear after announcement has been read
      clearTimerRef.current = globalThis.setTimeout(() => {
        setPoliteMessage('');
        setAssertiveMessage('');
        clearTimerRef.current = null;
      }, ANNOUNCE_AUTO_CLEAR_MS);
    },
    [],
  );

  return (
    <LiveRegionContext.Provider value={{ announce }}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="true"
        role="status"
        style={{
          position: 'absolute',
          width: '1px',
          height: '1px',
          padding: 0,
          margin: '-1px',
          overflow: 'hidden',
          clip: 'rect(0, 0, 0, 0)',
          whiteSpace: 'nowrap',
          border: 0,
        }}
      >
        {politeMessage}
      </div>
      <div
        aria-live="assertive"
        aria-atomic="true"
        role="alert"
        style={{
          position: 'absolute',
          width: '1px',
          height: '1px',
          padding: 0,
          margin: '-1px',
          overflow: 'hidden',
          clip: 'rect(0, 0, 0, 0)',
          whiteSpace: 'nowrap',
          border: 0,
        }}
      >
        {assertiveMessage}
      </div>
    </LiveRegionContext.Provider>
  );
};

/**
 * Hook to programmatically announce messages to screen readers.
 *
 * Must be used within a `<LiveRegion>` provider. Announcements use
 * `aria-live` regions to communicate status changes to assistive technology.
 *
 * @returns Object with an `announce` function
 * @throws When used outside of a `<LiveRegion>` provider
 *
 * @example
 * ```tsx
 * const { announce } = useAnnounce();
 * announce('Item deleted', 'assertive');
 * announce('Page loaded');  // defaults to 'polite'
 * ```
 */
export function useAnnounce(): UseAnnounceResult {
  const ctx = useContext(LiveRegionContext);
  if (ctx === null) {
    throw new Error('useAnnounce must be used within a <LiveRegion> provider');
  }
  return { announce: ctx.announce };
}
