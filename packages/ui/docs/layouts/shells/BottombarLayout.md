# BottombarLayout

## Overview

A bottom status/action bar component with left, center, and right sections. Used as the footer slot in AppShell or standalone for status bars.

## Import

```tsx
import { BottombarLayout } from '@abe-stack/ui';
```

## Props

| Prop      | Type               | Default    | Description                                     |
| --------- | ------------------ | ---------- | ----------------------------------------------- |
| children  | `ReactNode`        | -          | Fallback content (used when slots not provided) |
| left      | `ReactNode`        | -          | Left section content (version, status info)     |
| center    | `ReactNode`        | -          | Center section content (shortcuts, info)        |
| right     | `ReactNode`        | -          | Right section content (actions, toggles)        |
| height    | `string \| number` | `'2.5rem'` | Height of the bar                               |
| bordered  | `boolean`          | `true`     | Show top border                                 |
| className | `string`           | `''`       | Additional CSS classes                          |
| style     | `CSSProperties`    | -          | Additional inline styles                        |

## Usage

### Basic Example with Slots

```tsx
<BottombarLayout
  left={<VersionBadge version="1.0.0" />}
  center={<Text tone="muted">Press ? for shortcuts</Text>}
  right={<ThemeToggle />}
/>
```

### Simple Children Fallback

```tsx
<BottombarLayout>
  <Text tone="muted">Ready</Text>
</BottombarLayout>
```

### Inside AppShell

```tsx
<AppShell
  footer={
    <BottombarLayout
      left={
        <div className="bar-section">
          <VersionBadge version={config.version} />
          <EnvironmentBadge environment="development" />
        </div>
      }
      center={
        <Text tone="muted">
          <Kbd>?</Kbd> Help
        </Text>
      }
      right={
        <Button size="small" onClick={cycleTheme}>
          Toggle Theme
        </Button>
      }
    />
  }
>
  <MainContent />
</AppShell>
```

### Without Border

```tsx
<BottombarLayout bordered={false}>
  <StatusIndicator />
</BottombarLayout>
```

## CSS Custom Properties

BottombarLayout uses CSS variables for styling:

```css
--bottombar-height: 2.5rem; /* or provided value */
```

## Responsive Behavior

The center section is hidden on mobile (< 768px) to save space. Left and right sections remain visible.

## Accessibility

- Renders as `<footer>` element for semantic HTML
- Use for status information, not primary navigation
- Keep content concise and scannable

## Do's and Don'ts

### Do

- Use for status bars and secondary actions
- Keep information minimal and relevant
- Include version/environment info during development
- Put keyboard shortcuts in center section

### Don't

- Use for primary navigation (use TopbarLayout)
- Overcrowd with too many items
- Make height too large

## Related Components

- [TopbarLayout](./TopbarLayout.md) - Top navigation bar
- [AppShell](./AppShell.md) - Complete application shell

## References

- [Source Code](../../src/layouts/shells/BottombarLayout.tsx)
- [Tests](../../src/layouts/shells/__tests__/BottombarLayout.test.tsx)
