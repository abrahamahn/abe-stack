import { ComponentType, forwardRef, PropsWithoutRef } from 'react';

export function passthroughRef<P extends object, T = unknown>(Component: ComponentType<P>) {
  const ForwardedComponent = forwardRef<T, PropsWithoutRef<P>>((props, ref) => {
    return <Component {...(props as P)} ref={ref} />;
  });
  ForwardedComponent.displayName = `ForwardedRef(${Component.displayName || Component.name || 'Component'})`;
  return ForwardedComponent;
}
