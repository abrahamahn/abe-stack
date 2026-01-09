# RightSidebarLayout

## Overview

A right sidebar/panel component with header and content sections. Typically used for documentation, details, or property panels. Used as the aside slot in AppShell or standalone.

## Import

```tsx
import { RightSidebarLayout } from '@abe-stack/ui';
```

## Props

| Prop      | Type               | Default   | Description                                     |
| --------- | ------------------ | --------- | ----------------------------------------------- |
| children  | `ReactNode`        | -         | Fallback content (used when slots not provided) |
| header    | `ReactNode`        | -         | Header section (title, close button)            |
| content   | `ReactNode`        | -         | Main scrollable content                         |
| width     | `string \| number` | `'20rem'` | Width of the panel                              |
| bordered  | `boolean`          | `true`    | Show left border                                |
| onClose   | `() => void`       | -         | Callback when panel is closed                   |
| className | `string`           | `''`      | Additional CSS classes                          |
| style     | `CSSProperties`    | -         | Additional inline styles                        |

## Usage

### Basic Example with Slots

```tsx
<RightSidebarLayout
  header={
    <div className="panel-header">
      <Heading as="h2" size="md">
        Documentation
      </Heading>
      <CloseButton onClick={handleClose} />
    </div>
  }
  content={<DocumentationContent />}
/>
```

### Property Panel

```tsx
<RightSidebarLayout width="300px" bordered>
  <div className="panel-header">
    <Heading size="sm">Properties</Heading>
  </div>
  <div className="panel-content">
    <Input label="Name" value={name} onChange={setName} />
    <Select label="Type" options={types} value={type} onChange={setType} />
  </div>
</RightSidebarLayout>
```

### Inside AppShell

```tsx
<AppShell
  aside={
    <RightSidebarLayout
      header={
        <div className="panel-header">
          <Heading as="h2" size="md">
            Details
          </Heading>
          <CloseButton onClick={() => setShowAside(false)} />
        </div>
      }
      content={
        <div className="panel-content">
          {selectedItem ? (
            <ItemDetails item={selectedItem} />
          ) : (
            <Text tone="muted">Select an item to view details</Text>
          )}
        </div>
      }
    />
  }
  asideWidth="20rem"
  asideCollapsed={!showAside}
>
  <MainContent />
</AppShell>
```

### Documentation Panel

```tsx
<RightSidebarLayout width="25rem">
  <div className="panel-header">
    <Heading size="md">API Reference</Heading>
    <CloseButton aria-label="Close panel" onClick={onClose} />
  </div>
  <div className="panel-content">
    <section>
      <Heading as="h3" size="sm">
        Description
      </Heading>
      <Text>{component.description}</Text>
    </section>
    <section>
      <Heading as="h3" size="sm">
        Props
      </Heading>
      <PropsTable props={component.props} />
    </section>
  </div>
</RightSidebarLayout>
```

## CSS Custom Properties

RightSidebarLayout uses CSS variables for styling:

```css
--right-sidebar-width: 20rem; /* or provided value */
```

## Utility Classes

Use these classes for consistent panel styling:

```tsx
<div className="panel-header">  // Flex, space-between, padding
  <Heading>Title</Heading>
  <CloseButton />
</div>
<div className="panel-content">  // Padding, overflow-y auto, flex column
  <Content />
</div>
```

## Accessibility

- Renders as `<aside>` element for semantic HTML
- Include close button with proper aria-label
- Consider adding aria-labelledby pointing to header

## Do's and Don'ts

### Do

- Use for secondary content and details
- Include a clear close/collapse mechanism
- Make content scrollable for long content
- Use panel-header and panel-content classes

### Don't

- Use for primary content
- Make too wide (> 400px usually)
- Forget close button for dismissible panels

## Related Components

- [LeftSidebarLayout](./LeftSidebarLayout.md) - Left sidebar component
- [AppShell](./AppShell.md) - Complete application shell
- [Modal](./Modal.md) - Overlay dialog

## References

- [Source Code](../../src/layouts/shells/RightSidebarLayout.tsx)
