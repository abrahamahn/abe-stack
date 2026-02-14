// main/client/react/src/hooks/useCopyToClipboard.ts
import { MS_PER_SECOND } from '@abe-stack/shared';
import { useEffect, useRef, useState } from 'react';

const COPY_FEEDBACK_MS = MS_PER_SECOND * 2;

type CopyToClipboardResult = {
  copied: boolean;
  copy: (text: string) => Promise<void>;
  error: Error | null;
};

/**
 * Copy text to clipboard with feedback.
 * Automatically resets `copied` state after 2 seconds.
 *
 * @returns Object with copied state, copy function, and error
 */
export function useCopyToClipboard(): CopyToClipboardResult {
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return (): void => {
      if (timeoutRef.current !== null) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, []);

  const copy = async (text: string): Promise<void> => {
    const runtimeNavigator = (globalThis as { navigator?: Navigator }).navigator;
    const clipboard = runtimeNavigator?.clipboard;

    if (clipboard?.writeText == null) {
      const clipboardError = new Error('Clipboard API not available');
      setError(clipboardError);
      return;
    }

    try {
      await clipboard.writeText(text);
      setCopied(true);
      setError(null);

      // Reset copied state after feedback duration
      if (timeoutRef.current !== null) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout((): void => {
        setCopied(false);
      }, COPY_FEEDBACK_MS);
    } catch (err) {
      const copyError = err instanceof Error ? err : new Error('Failed to copy');
      setError(copyError);
      setCopied(false);
    }
  };

  return { copied, copy, error };
}
