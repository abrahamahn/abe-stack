import { useEffect, useState } from 'react';

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia(query).matches;
  });

  useEffect((): (() => void) | undefined => {
    if (typeof window === 'undefined') return;
    const media = window.matchMedia(query);
    const listener = (): void => {
      setMatches(media.matches);
    };
    listener();
    media.addEventListener('change', listener);
    return (): void => {
      media.removeEventListener('change', listener);
    };
  }, [query]);

  return matches;
}
