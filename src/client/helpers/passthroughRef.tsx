import React, { forwardRef, ForwardedRef, ComponentType, PropsWithoutRef, RefAttributes } from 'react';

export function passthroughRef<P extends object, T = unknown>(
	Component: ComponentType<P>
) {
	return forwardRef<T, PropsWithoutRef<P>>((props, ref) => {
		return <Component {...props as P} ref={ref} />;
	});
}
