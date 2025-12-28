import { useEffect, useRef } from "react";

// Define types similar to what popper.js provides
export type Placement =
  | "top"
  | "bottom"
  | "right"
  | "left"
  | "top-start"
  | "top-end"
  | "bottom-start"
  | "bottom-end"
  | "right-start"
  | "right-end"
  | "left-start"
  | "left-end";

export interface Options {
  placement?: Placement;
  modifiers?: Array<{ name: string; options?: Record<string, unknown> }>;
  strategy?: "absolute" | "fixed";
}

export interface Instance {
  destroy: () => void;
  update: () => Promise<{ placement: Placement }>;
  state: { placement: Placement };
}

// Simple positioning function to replace popper.js
function createSimplePopper(
  referenceElement: HTMLElement,
  popperElement: HTMLElement,
  options: Options = {},
): Instance {
  const placement = options.placement || "bottom";
  const strategy = options.strategy || "absolute";

  function update() {
    if (!referenceElement || !popperElement) {
      return Promise.resolve({ placement });
    }

    const refRect = referenceElement.getBoundingClientRect();

    popperElement.style.position = strategy;

    // Basic positioning based on placement
    switch (placement) {
      case "top":
        popperElement.style.bottom = `${window.innerHeight - refRect.top}px`;
        popperElement.style.left = `${refRect.left + refRect.width / 2 - popperElement.offsetWidth / 2}px`;
        break;
      case "bottom":
        popperElement.style.top = `${refRect.bottom}px`;
        popperElement.style.left = `${refRect.left + refRect.width / 2 - popperElement.offsetWidth / 2}px`;
        break;
      case "left":
        popperElement.style.right = `${window.innerWidth - refRect.left}px`;
        popperElement.style.top = `${refRect.top + refRect.height / 2 - popperElement.offsetHeight / 2}px`;
        break;
      case "right":
        popperElement.style.left = `${refRect.right}px`;
        popperElement.style.top = `${refRect.top + refRect.height / 2 - popperElement.offsetHeight / 2}px`;
        break;
      case "bottom-start":
        popperElement.style.top = `${refRect.bottom}px`;
        popperElement.style.left = `${refRect.left}px`;
        break;
      case "bottom-end":
        popperElement.style.top = `${refRect.bottom}px`;
        popperElement.style.left = `${refRect.right - popperElement.offsetWidth}px`;
        break;
      // Add other placements as needed
      default:
        popperElement.style.top = `${refRect.bottom}px`;
        popperElement.style.left = `${refRect.left}px`;
    }

    return Promise.resolve({ placement });
  }

  // Initial positioning
  void update();

  // Return an instance similar to popper.js
  return {
    destroy: () => {},
    update,
    state: { placement },
  };
}

export function usePopper(
  referenceElement: HTMLElement | null,
  popperElement: HTMLElement | null,
  options: Options = {},
) {
  const popperInstanceRef = useRef<Instance | null>(null);

  useEffect(() => {
    if (referenceElement && popperElement) {
      // Create new popper instance
      popperInstanceRef.current = createSimplePopper(
        referenceElement,
        popperElement,
        options,
      );

      // Clean up on unmount
      return () => {
        if (popperInstanceRef.current) {
          popperInstanceRef.current.destroy();
          popperInstanceRef.current = null;
        }
      };
    }
    return undefined;
  }, [referenceElement, popperElement, options]);

  return { update: () => popperInstanceRef.current?.update() };
}

export { createSimplePopper as createPopper };
