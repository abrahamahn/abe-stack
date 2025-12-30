# Tooltip

## Overview

A simple tooltip component that displays helpful information when users hover over an element, with configurable placement options.

## Import

```tsx
import { Tooltip } from 'abeahn-ui/primitives';
```

## Props

| Prop      | Type                                     | Default | Description                          |
| --------- | ---------------------------------------- | ------- | ------------------------------------ |
| content   | `ReactNode` (required)                   | -       | Tooltip content to display           |
| placement | `'top' \| 'bottom' \| 'left' \| 'right'` | `'top'` | Tooltip position relative to trigger |
| children  | `ReactNode` (required)                   | -       | Trigger element                      |

## Usage

### Basic Example

```tsx
<Tooltip content="This is helpful information">
  <button>Hover me</button>
</Tooltip>
```

### Different Placements

```tsx
<Tooltip content="Tooltip above" placement="top">
  <button>Top</button>
</Tooltip>

<Tooltip content="Tooltip below" placement="bottom">
  <button>Bottom</button>
</Tooltip>

<Tooltip content="Tooltip on left" placement="left">
  <button>Left</button>
</Tooltip>

<Tooltip content="Tooltip on right" placement="right">
  <button>Right</button>
</Tooltip>
```

### Icon Button with Tooltip

```tsx
<Tooltip content="Delete item">
  <button aria-label="Delete">
    <IconTrash />
  </button>
</Tooltip>
```

### Rich Content

```tsx
<Tooltip
  content={
    <div>
      <strong>User Status</strong>
      <p>Last seen 2 hours ago</p>
    </div>
  }
>
  <Avatar src={user.avatar} alt={user.name} />
</Tooltip>
```

### Disabled Button

```tsx
<Tooltip content="You don't have permission to perform this action">
  <button disabled>Restricted Action</button>
</Tooltip>
```

### Form Field Help

```tsx
<div>
  <label>
    Password
    <Tooltip content="Must be at least 8 characters with 1 number">
      <IconHelp />
    </Tooltip>
  </label>
  <input type="password" />
</div>
```

### Truncated Text

```tsx
<Tooltip content={fullText}>
  <div style={{ width: '200px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
    {truncatedText}
  </div>
</Tooltip>
```

### Keyboard Shortcut

```tsx
<Tooltip content="Save (⌘S)">
  <button onClick={handleSave}>Save</button>
</Tooltip>
```

## Behavior

- Shows on mouse enter
- Hides on mouse leave with 80ms delay
- Content rendered conditionally (not in DOM when hidden)
- Placement controlled via CSS `data-placement` attribute
- Wraps children in `<span>` container

## Accessibility

**Important:** This tooltip is triggered by hover only, which has accessibility limitations:

- Not accessible to keyboard-only users
- Not accessible to touch screen users
- May be difficult for users with motor impairments

### For Better Accessibility

For critical information, consider:

```tsx
{
  /* Option 1: Always visible help text */
}
<div>
  <button>Action</button>
  <span id="help-text">This action will delete the item</span>
</div>;

{
  /* Option 2: Toggle-able tooltip (toggletip) */
}
<button
  onClick={() => setShowHelp(!showHelp)}
  aria-expanded={showHelp}
  aria-describedby="help-text"
>
  Help
</button>;
{
  showHelp && <div id="help-text">Help content</div>;
}

{
  /* Option 3: Use aria-label for icon buttons */
}
<button aria-label="Delete item">
  <IconTrash />
</button>;
```

### When Tooltip is Appropriate

- Supplementary information (not critical)
- Abbreviation expansions
- Icon labels (but also provide `aria-label`)
- Keyboard shortcuts
- Status explanations

### Improved Pattern

```tsx
<Tooltip content="Delete item">
  <button aria-label="Delete item">
    <IconTrash />
  </button>
</Tooltip>
```

## Do's and Don'ts

### Do

- Keep tooltip text concise (1-2 sentences)
- Use for supplementary, non-critical information
- Provide `aria-label` on icon buttons even with tooltip
- Test with keyboard and screen readers
- Consider mobile/touch interactions
- Use consistent placement across similar elements

### Don't

- Don't put critical information only in tooltips
- Don't use for complex interactions (use Popover instead)
- Don't use on disabled elements (may not trigger events)
- Don't nest interactive elements inside tooltips
- Don't rely on tooltips for accessibility
- Don't use very long text (use Popover or help dialog)

## Limitations

1. **Hover-only**: Not accessible via keyboard
2. **No focus management**: Tooltip doesn't receive focus
3. **Touch devices**: May not work on mobile/tablet
4. **Disabled elements**: May not trigger mouse events
5. **Positioning**: Uses CSS only, may overflow viewport

### For Advanced Tooltips

Consider using a library like:

- Floating UI / Popper.js for smart positioning
- Radix UI / Reach UI for accessible tooltips
- Custom implementation with focus and keyboard support

## Related Components

- [Popover](./Popover.md) - For complex, interactive content
- [VisuallyHidden](./VisuallyHidden.md) - For screen reader-only content

## References

- [Source](../../src/primitives/Tooltip.tsx)
- [Tests](../../src/primitives/__tests__/Tooltip.test.tsx)
- [Inclusive Components: Tooltips & Toggletips](https://inclusive-components.design/tooltips-toggletips/)
- [WCAG: Content on Hover or Focus](https://www.w3.org/WAI/WCAG21/Understanding/content-on-hover-or-focus.html)
