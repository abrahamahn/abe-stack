// src/apps/web/src/app/components/FeatureHint.tsx
import { Button, Text, useLocalStorage } from '@abe-stack/ui';
import { useCallback, useEffect, type ReactElement, type ReactNode } from 'react';

export interface FeatureHintProps {
  featureKey: string;
  title: string;
  description: string;
  placement?: 'top' | 'bottom' | 'left' | 'right';
  children: ReactNode;
}

export const FeatureHint = ({
  featureKey,
  title,
  description,
  placement = 'bottom',
  children,
}: FeatureHintProps): ReactElement => {
  const [dismissed, setDismissed] = useLocalStorage(`abe:hint:${featureKey}`, false);

  const dismiss = useCallback(() => {
    setDismissed(true);
  }, [setDismissed]);

  useEffect(() => {
    if (dismissed) return;
    const handleKeyDown = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') dismiss();
    };
    document.addEventListener('keydown', handleKeyDown);
    return (): void => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [dismissed, dismiss]);

  if (dismissed) return <>{children}</>;

  return (
    <span className="feature-hint" data-placement={placement}>
      {children}
      <span className="feature-hint-callout" role="status" aria-live="polite">
        <Text size="sm" className="font-semibold mb-1">
          {title}
        </Text>
        <Text size="xs" tone="muted" className="mb-2">
          {description}
        </Text>
        <Button type="button" size="small" variant="secondary" onClick={dismiss}>
          Got it
        </Button>
      </span>
    </span>
  );
};
