// src/apps/web/src/app/components/FeatureHint.tsx
import { useLocalStorage } from '@abe-stack/react/hooks';
import { Button, Text } from '@abe-stack/ui';
import { useCallback, useEffect, useRef, useState, type ReactElement, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

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
  const [position, setPosition] = useState({ top: 0, left: 0, ready: false });
  const anchorRef = useRef<HTMLSpanElement | null>(null);
  const calloutRef = useRef<HTMLSpanElement | null>(null);

  const dismiss = useCallback(() => {
    setDismissed(true);
  }, [setDismissed]);

  const updatePosition = useCallback((): void => {
    const anchor = anchorRef.current;
    const callout = calloutRef.current;
    if (anchor == null || callout == null) return;

    const gap = 8;
    const viewportPadding = 8;
    const anchorRect = anchor.getBoundingClientRect();
    const calloutRect = callout.getBoundingClientRect();

    let top = anchorRect.bottom + gap;
    let left = anchorRect.left;

    if (placement === 'top') {
      top = anchorRect.top - calloutRect.height - gap;
    } else if (placement === 'left') {
      top = anchorRect.top;
      left = anchorRect.left - calloutRect.width - gap;
    } else if (placement === 'right') {
      top = anchorRect.top;
      left = anchorRect.right + gap;
    }

    const maxLeft = Math.max(
      viewportPadding,
      window.innerWidth - calloutRect.width - viewportPadding,
    );
    const maxTop = Math.max(
      viewportPadding,
      window.innerHeight - calloutRect.height - viewportPadding,
    );
    const clampedLeft = Math.min(Math.max(viewportPadding, left), maxLeft);
    const clampedTop = Math.min(Math.max(viewportPadding, top), maxTop);

    setPosition({ top: clampedTop, left: clampedLeft, ready: true });
  }, [placement]);

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

  useEffect(() => {
    if (dismissed) return;

    const handleReposition = (): void => {
      updatePosition();
    };

    handleReposition();
    window.addEventListener('resize', handleReposition);
    window.addEventListener('scroll', handleReposition, true);

    return (): void => {
      window.removeEventListener('resize', handleReposition);
      window.removeEventListener('scroll', handleReposition, true);
    };
  }, [dismissed, updatePosition]);

  if (dismissed) return <>{children}</>;
  const callout = (
    <span
      ref={calloutRef}
      className="feature-hint-callout"
      role="status"
      aria-live="polite"
      style={{
        position: 'fixed',
        top: `${position.top}px`,
        left: `${position.left}px`,
        visibility: position.ready ? 'visible' : 'hidden',
      }}
    >
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
  );

  return (
    <span ref={anchorRef} className="feature-hint" data-placement={placement}>
      {children}
      {typeof document === 'undefined' ? null : createPortal(callout, document.body)}
    </span>
  );
};
