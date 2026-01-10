// packages/ui/src/hooks/useCopyToClipboard.ts
import { useEffect, useRef, useState } from 'react';

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
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, []);

  const copy = async (text: string): Promise<void> => {
    if (typeof navigator === 'undefined' || typeof navigator.clipboard === 'undefined') {
      const clipboardError = new Error('Clipboard API not available');
      setError(clipboardError);
      return;
    }

    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setError(null);

      // Reset copied state after 2 seconds
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout((): void => {
        setCopied(false);
      }, 2000);
    } catch (err) {
      const copyError = err instanceof Error ? err : new Error('Failed to copy');
      setError(copyError);
      setCopied(false);
    }
  };

  return { copied, copy, error };
}
