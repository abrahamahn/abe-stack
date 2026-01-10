# AuthLayout

## Overview

A centered layout specifically designed for authentication pages (login, signup, forgot password) with card-based presentation.

## Import

```tsx
import { AuthLayout } from 'abeahn-ui/layouts';
```

## Props

| Prop        | Type                   | Default | Description                     |
| ----------- | ---------------------- | ------- | ------------------------------- |
| title       | `ReactNode`            | -       | Page title (rendered as `<h1>`) |
| description | `ReactNode`            | -       | Page description/subtitle       |
| children    | `ReactNode` (required) | -       | Form or auth content            |

## Usage

### Basic Login Page

```tsx
<AuthLayout title="Sign In" description="Welcome back! Please sign in to continue.">
  <form onSubmit={handleLogin}>
    <Input label="Email" type="email" />
    <Input label="Password" type="password" />
    <Button type="submit">Sign In</Button>
  </form>
</AuthLayout>
```

### Signup Page

```tsx
<AuthLayout title="Create Account" description="Sign up to get started with our platform.">
  <form onSubmit={handleSignup}>
    <Input label="Full Name" />
    <Input label="Email" type="email" />
    <Input label="Password" type="password" />
    <Input label="Confirm Password" type="password" />
    <Button type="submit">Create Account</Button>
  </form>
</AuthLayout>
```

### Forgot Password

```tsx
<AuthLayout title="Reset Password" description="Enter your email to receive a password reset link.">
  <form onSubmit={handleReset}>
    <Input label="Email" type="email" />
    <Button type="submit">Send Reset Link</Button>
    <div style={{ marginTop: '16px', textAlign: 'center' }}>
      <Link to="/login">Back to Sign In</Link>
    </div>
  </form>
</AuthLayout>
```

### With Social Login

```tsx
<AuthLayout title="Sign In">
  <div style={{ display: 'grid', gap: '12px' }}>
    <Button variant="secondary" onClick={handleGoogleLogin}>
      <IconGoogle /> Sign in with Google
    </Button>
    <Button variant="secondary" onClick={handleGithubLogin}>
      <IconGithub /> Sign in with GitHub
    </Button>

    <Divider />

    <form onSubmit={handleEmailLogin}>
      <Input label="Email" type="email" />
      <Input label="Password" type="password" />
      <Button type="submit">Sign In</Button>
    </form>
  </div>
</AuthLayout>
```

### Without Title

```tsx
<AuthLayout>
  <div style={{ textAlign: 'center', marginBottom: '24px' }}>
    <Logo />
  </div>
  <form onSubmit={handleLogin}>
    <Input label="Email" type="email" />
    <Input label="Password" type="password" />
    <Button type="submit">Sign In</Button>
  </form>
</AuthLayout>
```

## Features

- Vertically centered on viewport (`min-height: 100vh`)
- Uses Container with `size="sm"` (640px max-width)
- Card presentation with border, shadow, and padding
- Responsive padding and spacing
- Semantic heading and paragraph markup

## Styling Details

The card container includes:

- Padding: `calc(var(--ui-gap-lg) * 2)`
- Border radius: `var(--ui-radius-md)`
- Border: `1px solid var(--ui-color-border)`
- Box shadow: `var(--ui-color-shadow)`

## Accessibility

- Title rendered as `<h1>` for proper heading hierarchy
- Description uses muted text color
- Center-aligned vertically for focus
- Works with form validation and error messages

## Do's and Don'ts

### Do

- Use for login, signup, reset password pages
- Keep forms simple and focused
- Provide clear error messages
- Add links for navigation (forgot password, sign up)
- Test on mobile devices

### Don't

- Don't use for dashboard or app pages
- Don't put too much content in the card
- Don't forget password visibility toggle
- Don't skip form validation
- Don't make forms too long (split into steps)

## Related Components

- [Input](../components/Input.md) - Form inputs
- [Button](../components/Button.md) - Submit buttons
- [Container](./Container.md) - Used internally

## References

- [Source](../../src/layouts/AuthLayout.tsx)
