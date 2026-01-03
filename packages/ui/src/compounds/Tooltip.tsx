import { useEffect, useRef, useState, type ReactElement, type ReactNode } from 'react';
import '../styles/elements.css';

type Placement = 'top' | 'bottom' | 'left' | 'right';

type TooltipProps = {
  content: ReactNode;
  placement?: Placement;
  children: ReactNode;
};

export function Tooltip({ content, placement = 'top', children }: TooltipProps): ReactElement {
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
    <span className="ui-tooltip" data-placement={placement} onMouseEnter={show} onMouseLeave={hide}>
      {children}
      {open ? <span className="ui-tooltip-content">{content}</span> : null}
    </span>
  );
}
