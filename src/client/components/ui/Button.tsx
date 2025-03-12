import React, { forwardRef, ComponentPropsWithoutRef } from 'react';

interface ButtonProps extends ComponentPropsWithoutRef<'button'> {
	variant?: 'primary' | 'naked';
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>((props, ref) => {
	const { variant, ...rest } = props;
	return <button ref={ref} {...rest} />;
});

export const PrimaryButton = forwardRef<HTMLButtonElement, ButtonProps>((props, ref) => {
	return (
		<Button
			ref={ref}
			{...props}
			variant="primary"
			style={{
				backgroundColor: '#3b82f6',
				color: 'white',
				border: 'none',
				padding: '0.5rem 1rem',
				borderRadius: '0.25rem',
				cursor: 'pointer',
				...props.style,
			}}
		/>
	);
});

export const NakedButton = forwardRef<HTMLButtonElement, ButtonProps>((props, ref) => {
	return (
		<Button
			ref={ref}
			{...props}
			variant="naked"
			style={{
				backgroundColor: 'transparent',
				border: 'none',
				padding: '0',
				cursor: 'pointer',
				...props.style,
			}}
		/>
	);
});

export default Button;
