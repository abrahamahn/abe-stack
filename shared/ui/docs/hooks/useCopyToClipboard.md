# useCopyToClipboard

## Overview

Copies text to the clipboard with success/error feedback. Automatically resets the copied state after 2 seconds.

## Import

```tsx
import { useCopyToClipboard } from '@abe-stack/ui';
```

## Signature

```tsx
function useCopyToClipboard(): {
  copied: boolean;
  copy: (text: string) => Promise<void>;
  error: Error | null;
};
```

## Returns

| Property | Type                              | Description                 |
| -------- | --------------------------------- | --------------------------- |
| copied   | `boolean`                         | True if copy was successful |
| copy     | `(text: string) => Promise<void>` | Function to copy text       |
| error    | `Error \| null`                   | Error if copy failed        |

## Usage

### Basic Example

```tsx
function CopyButton({ text }) {
  const { copied, copy } = useCopyToClipboard();

  return <button onClick={() => copy(text)}>{copied ? 'Copied!' : 'Copy'}</button>;
}
```

### With Error Handling

```tsx
function CopyCode({ code }) {
  const { copied, copy, error } = useCopyToClipboard();

  return (
    <div>
      <pre>{code}</pre>
      <button onClick={() => copy(code)}>{copied ? 'Copied!' : 'Copy Code'}</button>
      {error && <span className="error">{error.message}</span>}
    </div>
  );
}
```

### Copy Link Button

```tsx
function ShareLink({ url }) {
  const { copied, copy } = useCopyToClipboard();

  return (
    <button onClick={() => copy(url)}>
      {copied ? (
        <>
          <CheckIcon /> Link Copied
        </>
      ) : (
        <>
          <LinkIcon /> Copy Link
        </>
      )}
    </button>
  );
}
```

## Behavior

- Uses the Clipboard API
- `copied` resets to false after 2 seconds
- Handles SSR (returns error if clipboard unavailable)
- Cleans up timeout on unmount

## Do's and Don'ts

### Do

- Show visual feedback when copied
- Handle the error state gracefully
- Use for sharing URLs, code snippets, IDs

### Don't

- Copy sensitive data without user action
- Rely solely on clipboard (provide fallback)
- Forget to handle clipboard API unavailability

## References

- [Source Code](../../src/hooks/useCopyToClipboard.ts)
