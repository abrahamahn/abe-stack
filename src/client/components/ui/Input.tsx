import React, { forwardRef, ComponentPropsWithoutRef } from 'react';
import { passthroughRef } from "../../helpers/passthroughRef"

interface InputProps extends ComponentPropsWithoutRef<'input'> {}

export const Input = forwardRef<HTMLInputElement, InputProps>((props, ref) => {
	return (
		<input
			ref={ref}
			{...props}
			style={{
				padding: '0.5rem',
				border: '1px solid #e2e8f0',
				borderRadius: '0.25rem',
				outline: 'none',
				width: '100%',
				...props.style,
			}}
		/>
	);
});

// Also export as default for backward compatibility
export default Input;
