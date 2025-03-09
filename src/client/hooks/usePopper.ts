import { useState, useEffect } from 'react';
import { createPopper, Instance, Options } from '@popperjs/core';

export function usePopper(
  referenceElement: HTMLElement | null,
  popperElement: HTMLElement | null,
  options: Partial<Options> = {}
) {
  const [state, setState] = useState<{
    styles: { [key: string]: React.CSSProperties };
    attributes: { [key: string]: { [key: string]: string } };
  }>({
    styles: {
      popper: {
        position: 'absolute',
        left: '0',
        top: '0',
      },
    },
    attributes: {},
  });

  useEffect(() => {
    if (!referenceElement || !popperElement) {
      return;
    }

    const popperInstance = createPopper(referenceElement, popperElement, {
      ...options,
      modifiers: [
        ...(options.modifiers || []),
        {
          name: 'computeStyles',
          options: {
            gpuAcceleration: false,
          },
        },
      ],
    });

    popperInstance.setOptions((options) => ({
      ...options,
      onFirstUpdate: () => {
        popperInstance.forceUpdate();
      },
    }));

    return () => {
      popperInstance.destroy();
    };
  }, [referenceElement, popperElement, JSON.stringify(options)]);

  return {
    styles: state.styles,
    attributes: state.attributes,
    update: () => {},
  };
} 