# ScrollArea

## Overview

A custom scrollbar component with consistent cross-browser styling, auto-hide functionality, and smooth scrolling behavior.

## Import

```tsx
import { ScrollArea } from 'abeahn-ui/primitives';
```

## Props

| Prop           | Type                              | Default  | Description                                    |
| -------------- | --------------------------------- | -------- | ---------------------------------------------- |
| children       | `ReactNode` (required)            | -        | Content to be scrollable                       |
| maxHeight      | `string \| number`                | -        | Maximum height of the scroll area              |
| maxWidth       | `string \| number`                | -        | Maximum width of the scroll area               |
| scrollbarWidth | `'thin' \| 'normal' \| 'thick'`   | `'thin'` | Scrollbar width                                |
| hideDelay      | `number`                          | `2000`   | Auto-hide delay in milliseconds (0 to disable) |
| showOnHover    | `boolean`                         | `true`   | Show scrollbar on scrollbar hover              |
| className      | `string`                          | `''`     | Additional CSS classes to apply                |
| style          | `CSSProperties`                   | -        | Inline styles                                  |
| ...rest        | `ComponentPropsWithoutRef<'div'>` | -        | All standard HTML `<div>` attributes           |
| ref            | `Ref<HTMLDivElement>`             | -        | Forwarded ref to the container `<div>` element |

## Usage

### Basic Example

```tsx
<ScrollArea maxHeight="400px">
  <div>{longContent}</div>
</ScrollArea>
```

### Chat Messages

```tsx
<ScrollArea maxHeight="500px" scrollbarWidth="thin">
  {messages.map((msg) => (
    <div key={msg.id}>{msg.text}</div>
  ))}
</ScrollArea>
```

### Different Scrollbar Widths

```tsx
<ScrollArea maxHeight="300px" scrollbarWidth="thin">
  Thin scrollbar
</ScrollArea>

<ScrollArea maxHeight="300px" scrollbarWidth="normal">
  Normal scrollbar
</ScrollArea>

<ScrollArea maxHeight="300px" scrollbarWidth="thick">
  Thick scrollbar
</ScrollArea>
```

### Disable Auto-Hide

```tsx
<ScrollArea maxHeight="400px" hideDelay={0}>
  Content with always-visible scrollbar
</ScrollArea>
```

### Custom Hide Delay

```tsx
<ScrollArea maxHeight="400px" hideDelay={2000}>
  Content with 2-second hide delay
</ScrollArea>
```

### Don't Show on Hover

```tsx
<ScrollArea maxHeight="400px" showOnHover={false} hideDelay={500}>
  Scrollbar only visible when scrolling
</ScrollArea>
```

### Horizontal Scrolling

```tsx
<ScrollArea maxWidth="600px" maxHeight="300px">
  <div style={{ width: '1200px' }}>Wide content that scrolls horizontally and vertically</div>
</ScrollArea>
```

### Code Block

```tsx
<ScrollArea maxHeight="400px" scrollbarWidth="thin">
  <pre>
    <code>{longCode}</code>
  </pre>
</ScrollArea>
```

### Sidebar Content

```tsx
<aside style={{ width: '300px', height: '100vh' }}>
  <ScrollArea maxHeight="100%">
    <nav>
      <ul>
        {navigationItems.map((item) => (
          <li key={item.id}>{item.label}</li>
        ))}
      </ul>
    </nav>
  </ScrollArea>
</aside>
```

### Data Table Container

```tsx
<ScrollArea maxHeight="600px">
  <Table>
    <TableHeader>...</TableHeader>
    <TableBody>
      {rows.map((row) => (
        <TableRow key={row.id}>...</TableRow>
      ))}
    </TableBody>
  </Table>
</ScrollArea>
```

## Behavior

- Scrollbar auto-hides after `hideDelay` milliseconds of inactivity
- Uses WebKit scrollbar styling in Chromium/WebKit browsers; Firefox falls back to native scrollbars
- Scrollbar shows on hover if `showOnHover={true}`
- Scrollbar always visible during active scrolling
- Uses native scrolling behavior
- Consistent styling across browsers (WebKit, Firefox)
- Smooth opacity transitions

## Accessibility

- Uses native scroll behavior for keyboard support
- Keyboard navigation works by default (Arrow keys, Page Up/Down, Home/End)
- Focusable elements within scroll area maintain accessibility
- Screen readers announce scrollable regions
- Consider adding `aria-label` for context

### With Accessible Label

```tsx
<ScrollArea maxHeight="500px" aria-label="Chat message history" role="region">
  {messages}
</ScrollArea>
```

## Do's and Don'ts

### Do

- Use for long lists or content that exceeds viewport
- Set appropriate `maxHeight` for your layout
- Use thin scrollbars for subtle UI
- Consider mobile/touch scrolling
- Test with keyboard navigation
- Use in sidebars, modals, dropdowns

### Don't

- Don't use for short content (no scrolling needed)
- Don't set `maxHeight` too small (< 200px)
- Don't nest ScrollAreas unnecessarily
- Don't hide scrollbars completely (hideDelay={0} + showOnHover={false})
- Don't override native scroll behavior without good reason
- Don't use for entire page (use body scroll)

## Cross-Browser Support

- Uses CSS `scrollbar-width` for Firefox
- Uses CSS `scrollbar-color` for Firefox theming
- Uses WebKit-specific properties for Chrome/Safari
- Falls back to native scrollbars in unsupported browsers

## Performance Considerations

- Renders all content immediately (not virtualized)
- For very long lists (>1000 items), consider:
  - Virtual scrolling libraries (react-window, react-virtuoso)
  - Pagination
  - Lazy loading

## Related Components

- [Table](./Table.md) - Often wrapped in ScrollArea
- [Overlay](./Overlay.md) - For modal backgrounds

## References

- [Source](../../src/primitives/ScrollArea.tsx)
- [Tests](../../src/primitives/__tests__/ScrollArea.test.tsx)
- [MDN: overflow](https://developer.mozilla.org/en-US/docs/Web/CSS/overflow)
- [MDN: scrollbar-width](https://developer.mozilla.org/en-US/docs/Web/CSS/scrollbar-width)
