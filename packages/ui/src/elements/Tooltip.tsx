// packages/ui/src/elements/Tooltip.tsx
import { useEffect, useRef, useState, type ReactElement, type ReactNode } from 'react';
import '../styles/elements.css';

type Placement = 'top' | 'bottom' | 'left' | 'right';

type TooltipProps = {
  /** Tooltip content to display */
  content: ReactNode;
  /** Tooltip position relative to trigger */
  placement?: Placement;
  /** Trigger element */
  children: ReactNode;
};

/**
 * A simple tooltip that displays helpful information on hover.
 *
 * @example
 * ```tsx
 * <Tooltip content="Helpful info">
 *   <button>Hover me</button>
 * </Tooltip>
 * ```
 */
export const Tooltip = ({ content, placement = 'top', children }: TooltipProps): ReactElement => {
  const [open, setOpen] = useState<boolean>(false);
  const timeoutRef = useRef<ReturnType<typeof globalThis.setTimeout> | null>(null);

  useEffect(() => {
    return (): void => {
      if (timeoutRef.current !== null) {
        globalThis.clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const show = (): void => {
    if (timeoutRef.current !== null) {
      globalThis.clearTimeout(timeoutRef.current);
    }
    setOpen(true);
  };

  const hide = (): void => {
    timeoutRef.current = globalThis.setTimeout(() => {
      setOpen(false);
    }, 80);
  };

  return (
    <span className="tooltip" data-placement={placement} onMouseEnter={show} onMouseLeave={hide}>
      {children}
      {open ? <span className="tooltip-content">{content}</span> : null}
    </span>
  );
};
