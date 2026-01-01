# Edge Case Testing & TDD Conventions

## Philosophy

**Write tests that intentionally break code, then fix the code to pass.**

This approach ensures:

- Robust error handling
- Graceful degradation
- Prevention of runtime errors
- Complete test coverage

## The TDD Cycle

```
1. Write a failing test for edge case
2. Run test - verify it FAILS
3. Write minimal code to pass
4. Run test - verify it PASSES
5. Refactor if needed
6. Repeat
```

**CRITICAL:** Never write code first, then tests. Tests must fail before you fix them.

---

## Required Edge Cases for Components

### 1. Missing Required Props

**Test for:** Component behavior when required props are omitted.

```tsx
// BAD - Only testing happy path
it('renders header', () => {
  render(<TopbarLayout header={<div>Header</div>}>Content</TopbarLayout>);
  expect(screen.getByText('Header')).toBeInTheDocument();
});

// GOOD - Testing edge cases
it('renders without crashing when header is null', () => {
  expect(() => {
    render(<TopbarLayout header={null}>Content</TopbarLayout>);
  }).not.toThrow();
});

it('renders without crashing when header is undefined', () => {
  expect(() => {
    render(<TopbarLayout header={undefined}>Content</TopbarLayout>);
  }).not.toThrow();
});
```

### 2. Invalid Prop Types

**Test for:** Component behavior with unexpected types.

```tsx
it('handles non-numeric height values gracefully', () => {
  const { container } = render(
    <TopbarLayout header={<div>H</div>} headerHeight={NaN}>
      Content
    </TopbarLayout>,
  );

  // Should fallback to default or handle gracefully
  expect(container.firstChild).toBeInTheDocument();
});

it('handles negative height values', () => {
  const { container } = render(
    <TopbarLayout header={<div>H</div>} headerHeight={-100}>
      Content
    </TopbarLayout>,
  );

  // Should clamp to minimum or use default
  expect(container.firstChild).toHaveStyle({
    '--ui-header-height': '0px', // or default '64px'
  });
});
```

### 3. Boundary Conditions

**Test for:** Extreme values and limits.

```tsx
describe('boundary conditions', () => {
  it('handles zero height', () => {
    const { container } = render(
      <TopbarLayout header={<div>H</div>} headerHeight={0}>
        Content
      </TopbarLayout>,
    );

    expect(container.firstChild).toHaveStyle({
      '--ui-header-height': '0px',
    });
  });

  it('handles extremely large height', () => {
    const { container } = render(
      <TopbarLayout header={<div>H</div>} headerHeight={99999}>
        Content
      </TopbarLayout>,
    );

    // Should handle gracefully without breaking layout
    expect(container.firstChild).toBeInTheDocument();
  });

  it('handles empty string height', () => {
    const { container } = render(
      <TopbarLayout header={<div>H</div>} headerHeight="">
        Content
      </TopbarLayout>,
    );

    // Should fallback to default
    expect(container.firstChild).toHaveStyle({
      '--ui-header-height': '64px',
    });
  });
});
```

### 4. Empty/Null Children

**Test for:** Components with no content.

```tsx
it('renders with empty children', () => {
  expect(() => {
    render(<TopbarLayout header={<div>H</div>}>{null}</TopbarLayout>);
  }).not.toThrow();
});

it('renders with undefined children', () => {
  expect(() => {
    render(<TopbarLayout header={<div>H</div>} />);
  }).not.toThrow();
});

it('renders with empty fragment', () => {
  render(
    <TopbarLayout header={<div>H</div>}>
      <></>
    </TopbarLayout>,
  );

  const main = screen.getByRole('main');
  expect(main).toBeInTheDocument();
  expect(main).toBeEmptyDOMElement();
});
```

### 5. Special Characters & Injection

**Test for:** XSS prevention and special character handling.

```tsx
it('safely renders header with special characters', () => {
  render(
    <TopbarLayout header={<div>{'<script>alert("xss")</script>'}</div>}>Content</TopbarLayout>,
  );

  // Should render as text, not execute
  expect(screen.getByText('<script>alert("xss")</script>')).toBeInTheDocument();
});

it('handles className with special characters', () => {
  const { container } = render(
    <TopbarLayout header={<div>H</div>} className="test-class__with--special___chars">
      Content
    </TopbarLayout>,
  );

  expect(container.firstChild).toHaveClass('test-class__with--special___chars');
});
```

### 6. Rapid State Changes

**Test for:** Race conditions and rapid updates.

```tsx
it('handles rapid prop changes', () => {
  const { rerender } = render(
    <TopbarLayout header={<div>Header 1</div>} headerHeight={64}>
      Content
    </TopbarLayout>,
  );

  // Rapid updates
  rerender(
    <TopbarLayout header={<div>Header 2</div>} headerHeight={100}>
      Content
    </TopbarLayout>,
  );
  rerender(
    <TopbarLayout header={<div>Header 3</div>} headerHeight={50}>
      Content
    </TopbarLayout>,
  );
  rerender(
    <TopbarLayout header={<div>Header 4</div>} headerHeight={80}>
      Content
    </TopbarLayout>,
  );

  expect(screen.getByText('Header 4')).toBeInTheDocument();
});
```

### 7. Memory Leaks & Cleanup

**Test for:** Proper cleanup on unmount.

```tsx
it('cleans up properly on unmount', () => {
  const ref = { current: null };
  const { unmount } = render(
    <TopbarLayout header={<div>H</div>} ref={ref}>
      Content
    </TopbarLayout>,
  );

  expect(ref.current).toBeInstanceOf(HTMLDivElement);

  unmount();

  // Ref should still exist but component should be unmounted
  expect(ref.current).not.toBeInTheDocument();
});
```

### 8. User Interactions - Keyboard

**Test for:** Keyboard navigation, shortcuts, and accessibility.

```tsx
import { fireEvent } from '@testing-library/react';
import { vi } from 'vitest';

it('allows tab navigation through interactive elements', () => {
  render(
    <TopbarLayout
      header={
        <>
          <button>Button 1</button>
          <button>Button 2</button>
        </>
      }
    >
      <button>Main Button</button>
    </TopbarLayout>,
  );

  const button1 = screen.getByText('Button 1');
  const button2 = screen.getByText('Button 2');

  button1.focus();
  expect(button1).toHaveFocus();

  // Simulate tab to next element
  button2.focus();
  expect(button2).toHaveFocus();
});

it('handles Escape key', () => {
  const handleEscape = vi.fn();

  render(
    <TopbarLayout
      header={
        <div onKeyDown={(e) => e.key === 'Escape' && handleEscape()}>
          <button>Close</button>
        </div>
      }
    >
      Content
    </TopbarLayout>,
  );

  const closeButton = screen.getByText('Close');
  fireEvent.keyDown(closeButton, { key: 'Escape' });

  expect(handleEscape).toHaveBeenCalled();
});

it('handles Enter key on buttons', () => {
  const handleClick = vi.fn();

  render(
    <TopbarLayout header={<button onClick={handleClick}>Action</button>}>Content</TopbarLayout>,
  );

  const button = screen.getByText('Action');
  fireEvent.keyDown(button, { key: 'Enter' });
  fireEvent.click(button); // Enter triggers click

  expect(handleClick).toHaveBeenCalled();
});
```

### 9. User Interactions - Mouse/Touch Events

**Test for:** Click, hover, focus, blur, double-click.

```tsx
it('handles click events on interactive elements', () => {
  const handleClick = vi.fn();

  render(<TopbarLayout header={<button onClick={handleClick}>Menu</button>}>Content</TopbarLayout>);

  const button = screen.getByText('Menu');
  fireEvent.click(button);

  expect(handleClick).toHaveBeenCalledTimes(1);
});

it('handles double-click events', () => {
  const handleDoubleClick = vi.fn();

  render(
    <TopbarLayout header={<div onDoubleClick={handleDoubleClick}>Logo</div>}>Content</TopbarLayout>,
  );

  const logo = screen.getByText('Logo');
  fireEvent.doubleClick(logo);

  expect(handleDoubleClick).toHaveBeenCalled();
});

it('handles rapid clicks without breaking', () => {
  let clickCount = 0;
  const handleClick = () => {
    clickCount++;
  };

  render(
    <TopbarLayout header={<button onClick={handleClick}>Rapid</button>}>Content</TopbarLayout>,
  );

  const button = screen.getByText('Rapid');

  // Simulate rapid clicking (100 clicks)
  for (let i = 0; i < 100; i++) {
    fireEvent.click(button);
  }

  expect(clickCount).toBe(100);
});

it('handles focus and blur events', () => {
  const handleFocus = vi.fn();
  const handleBlur = vi.fn();

  render(
    <TopbarLayout header={<input onFocus={handleFocus} onBlur={handleBlur} placeholder="Search" />}>
      Content
    </TopbarLayout>,
  );

  const input = screen.getByPlaceholderText('Search');

  fireEvent.focus(input);
  expect(handleFocus).toHaveBeenCalled();

  fireEvent.blur(input);
  expect(handleBlur).toHaveBeenCalled();
});

it('handles mouseEnter and mouseLeave', () => {
  const handleMouseEnter = vi.fn();
  const handleMouseLeave = vi.fn();

  render(
    <TopbarLayout
      header={
        <div onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
          Hover me
        </div>
      }
    >
      Content
    </TopbarLayout>,
  );

  const hoverTarget = screen.getByText('Hover me');

  fireEvent.mouseEnter(hoverTarget);
  expect(handleMouseEnter).toHaveBeenCalled();

  fireEvent.mouseLeave(hoverTarget);
  expect(handleMouseLeave).toHaveBeenCalled();
});
```

### 10. User Interactions - Form Inputs

**Test for:** Form submission, input changes, validation.

```tsx
it('handles form submission', () => {
  const handleSubmit = vi.fn((e) => e.preventDefault());

  render(
    <TopbarLayout
      header={
        <form onSubmit={handleSubmit}>
          <input type="text" placeholder="Search" />
          <button type="submit">Submit</button>
        </form>
      }
    >
      Content
    </TopbarLayout>,
  );

  const button = screen.getByText('Submit');
  fireEvent.click(button);

  expect(handleSubmit).toHaveBeenCalled();
});

it('handles input changes', () => {
  const handleChange = vi.fn();

  render(
    <TopbarLayout header={<input onChange={handleChange} placeholder="Type here" />}>
      Content
    </TopbarLayout>,
  );

  const input = screen.getByPlaceholderText('Type here');
  fireEvent.change(input, { target: { value: 'test input' } });

  expect(handleChange).toHaveBeenCalled();
  expect(input).toHaveValue('test input');
});

it('handles rapid typing without lag', () => {
  const { rerender } = render(
    <TopbarLayout header={<input value="" onChange={() => {}} />}>Content</TopbarLayout>,
  );

  // Simulate typing each character
  const text = 'fast typing test';
  for (let i = 0; i < text.length; i++) {
    rerender(
      <TopbarLayout header={<input value={text.slice(0, i + 1)} onChange={() => {}} />}>
        Content
      </TopbarLayout>,
    );
  }

  const input = screen.getByRole('textbox');
  expect(input).toHaveValue('fast typing test');
});
```

### 11. User Interactions - Scroll & Resize

**Test for:** Window resize, scroll behavior, responsive updates.

```tsx
it('handles window resize events', () => {
  const { container } = render(<TopbarLayout header={<div>Header</div>}>Content</TopbarLayout>);

  // Simulate window resize
  global.innerWidth = 500;
  global.innerHeight = 800;
  fireEvent(window, new Event('resize'));

  // Component should still be in the document
  expect(container.firstChild).toBeInTheDocument();
});

it('maintains layout integrity on extreme resize', () => {
  const { container } = render(
    <TopbarLayout header={<div>Header</div>} headerHeight={64}>
      Content
    </TopbarLayout>,
  );

  // Very small
  global.innerWidth = 320;
  fireEvent(window, new Event('resize'));
  expect(container.firstChild).toBeInTheDocument();

  // Very large
  global.innerWidth = 3840;
  fireEvent(window, new Event('resize'));
  expect(container.firstChild).toBeInTheDocument();
});
```

---

## Component Testing Checklist

For every component test file, ensure you have tests for:

- [ ] **Happy path** - Normal usage with valid props
- [ ] **Missing props** - null, undefined, or omitted required props
- [ ] **Invalid types** - Wrong prop types (NaN, negative numbers, etc.)
- [ ] **Boundaries** - Zero, negative, extremely large values
- [ ] **Empty content** - null children, empty strings, empty arrays
- [ ] **Special characters** - XSS prevention, unusual input
- [ ] **Ref forwarding** - Proper ref handling
- [ ] **Cleanup** - No memory leaks on unmount
- [ ] **Accessibility** - Proper ARIA attributes and semantic HTML
- [ ] **Style overrides** - className and style prop forwarding
- [ ] **Keyboard interactions** - Tab, Enter, Escape, Arrow keys
- [ ] **Mouse interactions** - Click, double-click, hover, focus/blur
- [ ] **Form interactions** - Submit, input changes, validation
- [ ] **Responsive behavior** - Resize, orientation changes

---

## Practical Example: Complete Test Suite

```tsx
// packages/ui/src/layouts/__tests__/TopbarLayout.test.tsx
describe('TopbarLayout - Edge Cases', () => {
  describe('prop validation', () => {
    it('handles null header gracefully', () => {
      expect(() => {
        render(<TopbarLayout header={null}>Content</TopbarLayout>);
      }).not.toThrow();
    });

    it('handles undefined children', () => {
      const { container } = render(<TopbarLayout header={<div>H</div>} />);
      expect(container.querySelector('main')).toBeEmptyDOMElement();
    });
  });

  describe('height boundaries', () => {
    it('handles negative height by clamping to zero or default', () => {
      const { container } = render(
        <TopbarLayout header={<div>H</div>} headerHeight={-50}>
          Content
        </TopbarLayout>,
      );

      // Component should handle gracefully
      expect(container.firstChild).toBeInTheDocument();
    });

    it('handles NaN height by falling back to default', () => {
      const { container } = render(
        <TopbarLayout header={<div>H</div>} headerHeight={NaN}>
          Content
        </TopbarLayout>,
      );

      expect(container.firstChild).toHaveStyle({
        '--ui-header-height': '64px',
      });
    });

    it('handles zero height', () => {
      const { container } = render(
        <TopbarLayout header={<div>H</div>} headerHeight={0}>
          Content
        </TopbarLayout>,
      );

      expect(container.firstChild).toHaveStyle({
        '--ui-header-height': '0px',
      });
    });
  });

  describe('special characters', () => {
    it('renders header content with special characters safely', () => {
      render(<TopbarLayout header={<div>{'<>"&\\'}</div>}>Content</TopbarLayout>);

      expect(screen.getByText('<>"&\'')).toBeInTheDocument();
    });
  });
});
```

---

## Anti-Patterns to Avoid

### ❌ Only Testing Happy Paths

```tsx
// BAD - Only successful scenarios
it('renders layout', () => {
  render(<Layout header="Header">Content</Layout>);
  expect(screen.getByText('Header')).toBeInTheDocument();
});
```

### ❌ Not Verifying Test Failures

```tsx
// BAD - Writing test after code is already working
// (How do you know the test actually catches bugs?)

// GOOD - Write test first, watch it fail, then fix
```

### ❌ Ignoring Console Errors

```tsx
// BAD - Tests pass but console is full of warnings
// Always check for console errors/warnings in tests
```

### ❌ Testing Implementation Details

```tsx
// BAD - Testing internal state
expect(component.state.internalValue).toBe(5);

// GOOD - Testing observable behavior
expect(screen.getByRole('status')).toHaveTextContent('5');
```

---

## Integration with CI/CD

Ensure your test suite:

1. Fails loudly on edge case violations
2. Requires 100% of edge case tests to pass
3. Blocks merges if new edge cases aren't covered

```bash
# All edge cases must pass
pnpm test

# Coverage should include edge cases
pnpm test:coverage --threshold-branches=90
```

---

## See Also

- `./index.md` - Testing overview
- `./levels.md` - Test levels and expectations
- `./examples.md` - More test examples
- `../principles/index.md` - Core principles
