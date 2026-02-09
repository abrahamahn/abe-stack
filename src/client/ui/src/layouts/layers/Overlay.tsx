// src/client/ui/src/layouts/layers/Overlay.tsx
import {
  forwardRef,
  useEffect,
  useState,
  type ComponentPropsWithoutRef,
  type ReactElement,
} from 'react';
import { createPortal } from 'react-dom';
import '../../styles/elements.css';

type OverlayProps = ComponentPropsWithoutRef<'div'> & {
  open: boolean;
  onClick?: () => void;
};

const OverlayRenderFn = (
  props: OverlayProps,
  ref: React.Ref<HTMLDivElement>,
): ReactElement | null => {
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
    <div ref={ref} className={`overlay ${className}`.trim()} onClick={onClick} {...rest} />,
    document.body,
  );
};

export const Overlay = forwardRef<HTMLDivElement, OverlayProps>(OverlayRenderFn);

Overlay.displayName = 'Overlay';
