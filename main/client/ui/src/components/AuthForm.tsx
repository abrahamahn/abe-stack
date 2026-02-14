// main/client/ui/src/components/AuthForm.tsx
import {
  forwardRef,
  type ComponentPropsWithoutRef,
  type ElementType,
  type ReactElement,
} from 'react';

import { cn } from '../utils/cn';

import '../styles/elements.css';

type AuthFormRootProps = ComponentPropsWithoutRef<'div'> & {
  /** The HTML element or React component to render as */
  as?: ElementType;
};
/** Props for AuthFormLayout section sub-components. */
type AuthFormSectionProps = ComponentPropsWithoutRef<'div'>;

/**
 * Auth form layout compound component wrapping `.auth-form-*` CSS classes.
 *
 * @example
 * ```tsx
 * <AuthFormLayout>
 *   <AuthFormLayout.Content>
 *     <AuthFormLayout.Header>
 *       <AuthFormLayout.Title>Sign In</AuthFormLayout.Title>
 *       <AuthFormLayout.Subtitle>Welcome back</AuthFormLayout.Subtitle>
 *     </AuthFormLayout.Header>
 *     <AuthFormLayout.Fields>...</AuthFormLayout.Fields>
 *     <AuthFormLayout.Footer>...</AuthFormLayout.Footer>
 *   </AuthFormLayout.Content>
 * </AuthFormLayout>
 * ```
 */
const AuthFormRoot = forwardRef<HTMLElement, AuthFormRootProps>((props, ref) => {
  const { as = 'div', className, children, ...rest } = props;
  const Component: ElementType = as;
  return (
    <Component ref={ref} className={cn('auth-form', className)} {...rest}>
      {children}
    </Component>
  );
});
AuthFormRoot.displayName = 'AuthFormLayout';

/** Flex column container with gap for auth form sections. */
const AuthFormContent = ({ className, children, ...rest }: AuthFormSectionProps): ReactElement => (
  <div className={cn('auth-form-content', className)} {...rest}>
    {children}
  </div>
);

/** Centered header area for title and subtitle. */
const AuthFormHeader = ({ className, children, ...rest }: AuthFormSectionProps): ReactElement => (
  <div className={cn('auth-form-header', className)} {...rest}>
    {children}
  </div>
);

/** Large heading for the auth form. */
const AuthFormTitle = ({
  className,
  children,
  ...rest
}: ComponentPropsWithoutRef<'h2'>): ReactElement => (
  <h2 className={cn('auth-form-title', className)} {...rest}>
    {children}
  </h2>
);

/** Muted description text below the title. */
const AuthFormSubtitle = ({
  className,
  children,
  ...rest
}: ComponentPropsWithoutRef<'p'>): ReactElement => (
  <p className={cn('auth-form-subtitle', className)} {...rest}>
    {children}
  </p>
);

/** Field group container with vertical gap. */
const AuthFormFields = ({ className, children, ...rest }: AuthFormSectionProps): ReactElement => (
  <div className={cn('auth-form-fields', className)} {...rest}>
    {children}
  </div>
);

/** Danger-colored error message. */
const AuthFormError = ({ className, children, ...rest }: AuthFormSectionProps): ReactElement => (
  <div className={cn('auth-form-error', className)} {...rest}>
    {children}
  </div>
);

/** Bottom navigation area with muted text and link styling. */
const AuthFormFooter = ({ className, children, ...rest }: AuthFormSectionProps): ReactElement => (
  <div className={cn('auth-form-footer', className)} {...rest}>
    {children}
  </div>
);

/** Horizontal divider with centered text (e.g. "or"). */
const AuthFormDivider = ({ className, children, ...rest }: AuthFormSectionProps): ReactElement => (
  <div className={cn('auth-form-divider', className)} {...rest}>
    <span className="auth-form-divider-text">{children}</span>
  </div>
);

export const AuthFormLayout = Object.assign(AuthFormRoot, {
  Content: AuthFormContent,
  Header: AuthFormHeader,
  Title: AuthFormTitle,
  Subtitle: AuthFormSubtitle,
  Fields: AuthFormFields,
  Error: AuthFormError,
  Footer: AuthFormFooter,
  Divider: AuthFormDivider,
});
