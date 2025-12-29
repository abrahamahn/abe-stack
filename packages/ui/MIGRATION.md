# UI Library API Standardization Migration Guide

**Version:** 2.0.0
**Date:** 2025-12-29

This guide helps you migrate from v1.x to v2.0.0 of the ABE Stack UI library, which standardizes component APIs for better consistency and developer experience.

## Breaking Changes Summary

All changes are designed to create a unified API across components:

1. **Unified callback naming** - All state change callbacks are now `onChange`
2. **Uncontrolled mode support** - All stateful components now support `defaultValue`/`defaultChecked`/`defaultOpen`
3. **Standardized prop names** - Consistent naming for value and default props
4. **Polymorphic support** - Button, Input, Badge, and Card.Root now support the `as` prop
5. **Hook API updates** - `useDisclosure` hook has updated return values

---

## 1. Callback Naming Changes

All components now use `onChange` for state change callbacks.

### Switch, Checkbox, Radio

**Before:**

```tsx
<Switch checked={isOn} onCheckedChange={setIsOn} />
<Checkbox checked={agreed} onCheckedChange={setAgreed} />
<Radio name="option" checked={selected} onCheckedChange={() => setSelected(true)} />
```

**After:**

```tsx
<Switch checked={isOn} onChange={setIsOn} />
<Checkbox checked={agreed} onChange={setAgreed} />
<Radio name="option" checked={selected} onChange={(checked) => setSelected(checked)} />
```

**Note:** Radio callback signature changed from `() => void` to `(checked: boolean) => void`

### Select, Tabs, Accordion

**Before:**

```tsx
<Select value={val} onValueChange={setVal}>...</Select>
<Tabs value={tab} onValueChange={setTab} items={...} />
<Accordion value={open} onValueChange={setOpen} items={...} />
```

**After:**

```tsx
<Select value={val} onChange={setVal}>...</Select>
<Tabs value={tab} onChange={setTab} items={...} />
<Accordion value={open} onChange={setOpen} items={...} />
```

### Dialog, Dropdown, Popover

**Before:**

```tsx
<Dialog.Root open={isOpen} onOpenChange={setIsOpen}>...</Dialog.Root>
<Dropdown open={isOpen} onOpenChange={setIsOpen}>...</Dropdown>
<Popover open={isOpen} onOpenChange={setIsOpen}>...</Popover>
```

**After:**

```tsx
<Dialog.Root open={isOpen} onChange={setIsOpen}>...</Dialog.Root>
<Dropdown open={isOpen} onChange={setIsOpen}>...</Dropdown>
<Popover open={isOpen} onChange={setIsOpen}>...</Popover>
```

---

## 2. Uncontrolled Mode Support

All stateful components now support uncontrolled mode with default props.

### Boolean Components

**Before (controlled only):**

```tsx
const [checked, setChecked] = useState(false);
<Switch checked={checked} onChange={setChecked} />;
```

**After (uncontrolled option):**

```tsx
// Uncontrolled - manages its own state
<Switch defaultChecked={false} />

// Still supports controlled mode
<Switch checked={checked} onChange={setChecked} />
```

**Applies to:** Switch, Checkbox, Radio

### Value Components

**Before (controlled only):**

```tsx
const [value, setValue] = useState(0);
<Slider value={value} onChange={setValue} />;
```

**After (uncontrolled option):**

```tsx
// Uncontrolled
<Slider defaultValue={50} min={0} max={100} />

// Controlled
<Slider value={value} onChange={setValue} />
```

**Applies to:** Slider, Pagination, Select, Tabs, Accordion

### Visibility Components

**Before (partially supported):**

```tsx
<Dropdown open={isOpen} onChange={setIsOpen}>...</Dropdown>
<Popover open={isOpen} onChange={setIsOpen}>...</Popover>
```

**After (full support):**

```tsx
// Uncontrolled
<Dropdown defaultOpen={false}>...</Dropdown>
<Popover defaultOpen={false}>...</Popover>

// Controlled
<Dropdown open={isOpen} onChange={setIsOpen}>...</Dropdown>
```

**Applies to:** Dropdown, Popover

---

## 3. Prop Naming Changes

### Tabs

**Before:**

```tsx
<Tabs defaultId="tab1" items={items} />
```

**After:**

```tsx
<Tabs defaultValue="tab1" items={items} />
```

### Accordion

**Before:**

```tsx
<Accordion defaultOpenId="section1" items={items} />
```

**After:**

```tsx
<Accordion defaultValue="section1" items={items} />
```

### Pagination

**Before:**

```tsx
<Pagination page={currentPage} onChange={setCurrentPage} totalPages={10} />
```

**After:**

```tsx
<Pagination value={currentPage} onChange={setCurrentPage} totalPages={10} />
// Or uncontrolled:
<Pagination defaultValue={1} totalPages={10} />
```

---

## 4. Polymorphic Component Support

Button, Input, Badge, and Card.Root now support rendering as different HTML elements.

### Button

**New capability:**

```tsx
// Render as a link
<Button as="a" href="/path">Link Button</Button>

// Render as a div (not recommended for accessibility)
<Button as="div" onClick={...}>Div Button</Button>

// Default is still 'button'
<Button>Regular Button</Button>
```

### Input

**New capability:**

```tsx
// Render as textarea
<Input as="textarea" label="Description" rows={4} />

// Default is still 'input'
<Input label="Name" />
```

### Badge

**New capability:**

```tsx
// Render as div
<Badge as="div" tone="success">Status</Badge>

// Default is still 'span'
<Badge tone="info">Info</Badge>
```

### Card

**New capability:**

```tsx
// Render as article
<Card.Root as="article">
  <Card.Header>...</Card.Header>
  <Card.Body>...</Card.Body>
</Card.Root>

// Default is still 'div'
<Card.Root>...</Card.Root>
```

---

## 5. Hook API Changes

### useDisclosure

**Before:**

```tsx
const { isOpen, open, close, toggle, setOpen } = useDisclosure({
  isOpen: externalOpen,
  onOpenChange: setExternalOpen,
});
```

**After:**

```tsx
const { open, openFn, close, toggle, setOpen } = useDisclosure({
  open: externalOpen,
  onChange: setExternalOpen,
});
// Note: 'isOpen' renamed to 'open', open() function renamed to 'openFn()'
```

**Changes:**

- `isOpen` prop → `open`
- `onOpenChange` prop → `onChange`
- Returned `isOpen` boolean → `open`
- Returned `open()` function → `openFn()`

---

## Automated Migration

### Find and Replace Patterns

You can use these regex patterns for bulk migration:

#### 1. Switch/Checkbox Callbacks

```regex
Find:    onCheckedChange\s*=\s*\{
Replace: onChange={
```

#### 2. Select/Tabs/Accordion Callbacks

```regex
Find:    onValueChange\s*=\s*\{
Replace: onChange={
```

#### 3. Dialog/Dropdown/Popover Callbacks

```regex
Find:    onOpenChange\s*=\s*\{
Replace: onChange={
```

#### 4. Tabs Default Prop

```regex
Find:    defaultId=
Replace: defaultValue=
```

#### 5. Accordion Default Prop

```regex
Find:    defaultOpenId=
Replace: defaultValue=
```

#### 6. Pagination Value Prop

```regex
Find:    page=
Replace: value=
```

### Using VS Code

1. Open Find & Replace (`Cmd/Ctrl + Shift + H`)
2. Enable regex mode (`.* ` button)
3. Use patterns above to find and replace across your project
4. Review changes before committing

---

## Special Cases

### Radio Callback Signature

The Radio component's onChange callback now receives the checked state as a parameter.

**Before:**

```tsx
<Radio
  name="option"
  checked={selected === 'a'}
  onChange={() => setSelected('a')} // No parameter
/>
```

**After:**

```tsx
<Radio
  name="option"
  checked={selected === 'a'}
  onChange={(checked) => {
    // Now takes boolean parameter
    if (checked) setSelected('a');
  }}
/>
```

### RadioGroup Still Recommended

For groups of radio buttons, continue using RadioGroup for proper keyboard navigation:

```tsx
<RadioGroup value={selected} onChange={setSelected} aria-label="Options">
  <Radio value="a" label="Option A" />
  <Radio value="b" label="Option B" />
</RadioGroup>
```

---

## Migration Checklist

- [ ] Update all `onCheckedChange` → `onChange` (Switch, Checkbox, Radio)
- [ ] Update all `onValueChange` → `onChange` (Select, Tabs, Accordion)
- [ ] Update all `onOpenChange` → `onChange` (Dialog, Dropdown, Popover)
- [ ] Update Radio callbacks to handle `checked` parameter
- [ ] Replace `defaultId` → `defaultValue` in Tabs
- [ ] Replace `defaultOpenId` → `defaultValue` in Accordion
- [ ] Replace `page` → `value` in Pagination
- [ ] Update `useDisclosure` usage if used directly
- [ ] Consider using uncontrolled mode where appropriate
- [ ] Test all form components
- [ ] Update tests
- [ ] Run type-check and lint

---

## Testing Your Migration

After migrating, verify:

1. **Type Safety**: Run `pnpm type-check` to ensure no TypeScript errors
2. **Linting**: Run `pnpm lint` to catch any remaining issues
3. **Runtime Testing**: Test all forms and interactive components
4. **Controlled Components**: Verify state still updates correctly
5. **Uncontrolled Components**: Test default values work as expected

---

## Getting Help

If you encounter issues during migration:

1. Check this migration guide for your specific case
2. Review the component documentation for examples
3. Report issues at https://github.com/anthropics/claude-code/issues

---

## Benefits of This Update

- **Consistency**: All callbacks use `onChange` - easier to remember
- **Flexibility**: Uncontrolled mode reduces boilerplate for simple cases
- **Type Safety**: Better TypeScript support across the board
- **Accessibility**: Polymorphic support allows proper semantic HTML
- **Developer Experience**: Clearer, more predictable API

---

**Version**: 2.0.0
**Last Updated**: 2025-12-29
