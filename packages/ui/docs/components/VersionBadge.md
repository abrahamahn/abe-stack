# VersionBadge

## Overview

A simple badge component for displaying version information. Commonly used in footers, headers, or about sections to show the application version.

## Import

```tsx
import { VersionBadge } from '@abe-stack/ui';
```

## Props

| Prop      | Type     | Default | Description               |
| --------- | -------- | ------- | ------------------------- |
| version   | `string` | -       | Version string to display |
| prefix    | `string` | `'v'`   | Prefix before version     |
| className | `string` | `''`    | Additional CSS classes    |

## Usage

### Basic Example

```tsx
<VersionBadge version="1.2.3" />
// Renders: v1.2.3
```

### Custom Prefix

```tsx
<VersionBadge version="2.0.0" prefix="Version " />
// Renders: Version 2.0.0
```

### No Prefix

```tsx
<VersionBadge version="3.0.0" prefix="" />
// Renders: 3.0.0
```

### With Environment Badge

```tsx
<footer>
  <EnvironmentBadge environment="development" />
  <VersionBadge version={APP_VERSION} />
</footer>
```

### Semver Versions

```tsx
<VersionBadge version="1.0.0-beta.1" />
<VersionBadge version="2.0.0-rc.1" />
```

## Accessibility

- Uses semantic `<span>` element
- Text is readable by screen readers
- Styled with muted colors to not distract from main content

## Do's and Don'ts

### Do

- Display in footer or about sections
- Use semantic versioning format
- Pair with environment badge during development

### Don't

- Display prominently in main content areas
- Use as a button or interactive element
- Show internal build numbers to end users

## Related Components

- [EnvironmentBadge](./EnvironmentBadge.md) - Environment status badge
- [Badge](../elements/Badge.md) - Generic badge component
- [Text](../elements/Text.md) - Text display component

## References

- [Source Code](../../src/components/VersionBadge.tsx)
- [Tests](../../src/components/__tests__/VersionBadge.test.tsx)
