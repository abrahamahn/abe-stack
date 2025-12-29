import {
  forwardRef,
  useEffect,
  useState,
  type ComponentPropsWithoutRef,
  type ReactElement,
} from 'react';
import { createPortal } from 'react-dom';
import './primitives.css';

type OverlayProps = ComponentPropsWithoutRef<'div'> & {
  open: boolean;
  onClick?: () => void;
};

export const Overlay = forwardRef<HTMLDivElement, OverlayProps>(
  function Overlay(props, ref): ReactElement | null {
    const { open, className = '', onClick, ...rest } = props;
    const [mounted, setMounted] = useState(false);

    useEffect((): (() => void) => {
      setMounted(true);
      return (): void => {
        setMounted(false);
      };
    }, []);

    if (!open || !mounted) return null;

    return createPortal(
      <div ref={ref} className={`ui-overlay ${className}`.trim()} onClick={onClick} {...rest} />,
      document.body,
    );
  },
);

Overlay.displayName = 'Overlay';
