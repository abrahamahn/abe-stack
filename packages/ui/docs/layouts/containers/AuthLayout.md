# AuthLayout

## Overview

A centered layout specifically designed for authentication pages (login, signup, forgot password, reset password) and authentication modals with card-based presentation.

## Import

```tsx
import { AuthLayout } from '@abe-stack/ui';
```

## Props

| Prop     | Type                   | Default | Description          |
| -------- | ---------------------- | ------- | -------------------- |
| children | `ReactNode` (required) | -       | Form or auth content |

## Recommended Usage Pattern

The recommended pattern is to use `AuthLayout` together with `AuthForm` from the auth components. This ensures consistent styling between auth pages and the auth modal.

### With AuthForm (Recommended)

```tsx
import { AuthLayout } from '@abe-stack/ui';
import { AuthForm } from '@auth/components/AuthForms';
import { useAuth } from '@auth/hooks';
import { useNavigate } from 'react-router-dom';

export function LoginPage() {
  const navigate = useNavigate();
  const { login, forgotPassword } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Page behavior: onModeChange triggers navigation
  const handleModeChange = (mode: AuthMode): void => {
    if (mode === 'register') {
      navigate('/register');
    } else if (mode === 'forgot-password') {
      navigate('/auth?mode=forgot-password');
    }
  };

  const formProps: AuthFormProps = {
    mode: 'login',
    onLogin: handleLogin,
    onForgotPassword: handleForgotPassword,
    onModeChange: handleModeChange,
    isLoading,
    error,
  };

  return (
    <AuthLayout>
      <AuthForm {...formProps} />
    </AuthLayout>
  );
}
```

### Modal vs Page Behavior

The key difference between auth pages and auth modal is the `onModeChange` behavior:

| Context | `onModeChange` Behavior           |
| ------- | --------------------------------- |
| Modal   | Changes internal state (in-modal) |
| Page    | Triggers navigation (new route)   |

### Register Page Example

```tsx
import { AuthLayout } from '@abe-stack/ui';
import { AuthForm } from '@auth/components/AuthForms';

export function RegisterPage() {
  const navigate = useNavigate();
  const { register, resendVerification } = useAuth();

  const handleModeChange = (mode: AuthMode): void => {
    if (mode === 'login') {
      navigate('/login');
    } else if (mode === 'forgot-password') {
      navigate('/auth?mode=forgot-password');
    }
  };

  const formProps: AuthFormProps = {
    mode: 'register',
    onRegister: handleRegister,
    onResendVerification: resendVerification,
    onModeChange: handleModeChange,
    isLoading,
    error,
  };

  return (
    <AuthLayout>
      <AuthForm {...formProps} />
    </AuthLayout>
  );
}
```

### Reset Password Page Example

```tsx
import { AuthLayout } from '@abe-stack/ui';
import { AuthForm } from '@auth/components/AuthForms';

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const formProps: AuthFormProps = {
    mode: 'reset-password',
    onResetPassword: handleResetPassword,
    onModeChange: handleModeChange,
    initialData: { token: token ?? undefined },
    isLoading,
    error,
  };

  return (
    <AuthLayout>
      <AuthForm {...formProps} />
    </AuthLayout>
  );
}
```

### Custom Content (Status Pages)

For pages that don't use `AuthForm` (like email verification), use the `auth-form` CSS classes directly:

```tsx
import { AuthLayout, Button, Spinner, Text } from '@abe-stack/ui';

export function ConfirmEmailPage() {
  return (
    <AuthLayout>
      <div className="auth-form">
        <div className="auth-form-content">
          <div className="auth-form-header">
            <h2 className="auth-form-title">Verifying your email...</h2>
          </div>
          <div className="flex-center">
            <Spinner size="lg" />
          </div>
          <Text tone="muted" className="text-center">
            Please wait while we verify your email address.
          </Text>
        </div>
      </div>
    </AuthLayout>
  );
}
```

## AuthForm Modes

The `AuthForm` component supports the following modes:

| Mode              | Description                        |
| ----------------- | ---------------------------------- |
| `login`           | Sign in form with email/password   |
| `register`        | Create account form                |
| `forgot-password` | Request password reset form        |
| `reset-password`  | Set new password form (with token) |

## CSS Classes

The following CSS classes are available for custom auth content:

| Class               | Description                          |
| ------------------- | ------------------------------------ |
| `auth-form`         | Main form container                  |
| `auth-form-content` | Inner content wrapper with spacing   |
| `auth-form-header`  | Header section for title/description |
| `auth-form-title`   | Main title styling                   |
| `auth-form-footer`  | Footer section for links/actions     |

## Features

- Vertically centered on viewport (`min-height: 100vh`)
- Uses Container with `size="sm"` (640px max-width)
- Card presentation with border, shadow, and padding
- Responsive padding and spacing
- Consistent with AuthModal styling

## Styling Details

The card container includes:

- Padding: `calc(var(--ui-gap-lg) * 2)`
- Border radius: `var(--ui-radius-md)`
- Border: `1px solid var(--ui-color-border)`
- Box shadow: `var(--ui-color-shadow)`

## Accessibility

- Proper heading hierarchy (`<h2>` for form titles)
- Muted text colors for descriptions
- Works with form validation and error messages
- Keyboard navigation support
- Focus management in forms

## Do's and Don'ts

### Do

- Use `AuthLayout` + `AuthForm` for all auth pages
- Use the same pattern for modal and pages (only `onModeChange` differs)
- Keep forms simple and focused
- Provide clear error messages
- Test on mobile devices

### Don't

- Don't use for dashboard or app pages
- Don't create custom forms when `AuthForm` supports the mode
- Don't mix styling patterns (use consistent CSS classes)
- Don't forget to handle loading and error states

## Related Components

- `AuthForm` - Form component for auth flows (`apps/web/src/features/auth/components/AuthForms.tsx`)
- `AuthModal` - Modal wrapper for auth (`apps/web/src/features/auth/components/AuthModal.tsx`)
- [Container](./Container.md) - Used internally

## References

- [Source](../../../src/layouts/containers/AuthLayout.tsx)
