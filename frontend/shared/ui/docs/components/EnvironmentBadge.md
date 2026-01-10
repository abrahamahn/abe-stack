# EnvironmentBadge

## Overview

A badge component for displaying the current environment status (development, production, staging, test). Useful for headers or status bars to help users identify which environment they're in.

## Import

```tsx
import { EnvironmentBadge } from '@abe-stack/ui';
```

## Props

| Prop        | Type                                                   | Default | Description                  |
| ----------- | ------------------------------------------------------ | ------- | ---------------------------- |
| environment | `'development' \| 'production' \| 'staging' \| 'test'` | -       | Environment to display       |
| short       | `boolean`                                              | `true`  | Use short labels (DEV, PROD) |
| className   | `string`                                               | `''`    | Additional CSS classes       |

## Usage

### Basic Example

```tsx
<EnvironmentBadge environment="development" />
// Renders: DEV
```

### Full Labels

```tsx
<EnvironmentBadge environment="production" short={false} />
// Renders: Production
```

### All Environments

```tsx
<EnvironmentBadge environment="development" />  // DEV
<EnvironmentBadge environment="production" />   // PROD
<EnvironmentBadge environment="staging" />      // STG
<EnvironmentBadge environment="test" />         // TEST
```

### In Header

```tsx
<header>
  <h1>My App</h1>
  {process.env.NODE_ENV !== 'production' && <EnvironmentBadge environment={process.env.NODE_ENV} />}
</header>
```

## Accessibility

- Uses semantic `<span>` element
- Color-coded per environment for visual distinction
- Text content is readable by screen readers

## Do's and Don'ts

### Do

- Display in development/staging to prevent confusion
- Use short labels in compact UIs
- Consider hiding in production for end users

### Don't

- Use as the only indicator of environment
- Display sensitive environment info to untrusted users
- Mix short and full labels inconsistently

## Related Components

- [Badge](../elements/Badge.md) - Generic badge component
- [VersionBadge](./VersionBadge.md) - Version display badge

## References

- [Source Code](../../src/components/EnvironmentBadge.tsx)
- [Tests](../../src/components/__tests__/EnvironmentBadge.test.tsx)
