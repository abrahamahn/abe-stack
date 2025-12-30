# Avatar

## Overview

A component for displaying user avatars with support for images and text fallbacks.

## Import

```tsx
import { Avatar } from 'abeahn-ui/primitives';
```

## Props

| Prop      | Type                              | Default | Description                                                  |
| --------- | --------------------------------- | ------- | ------------------------------------------------------------ |
| src       | `string`                          | -       | URL of the avatar image                                      |
| alt       | `string`                          | -       | Alternative text for the image (important for accessibility) |
| fallback  | `string`                          | -       | Text to display when image is not provided or fails to load  |
| className | `string`                          | `''`    | Additional CSS classes to apply                              |
| ...rest   | `ComponentPropsWithoutRef<'div'>` | -       | All standard HTML `<div>` attributes                         |
| ref       | `Ref<HTMLDivElement>`             | -       | Forwarded ref to the container `<div>` element               |

## Usage

### With Image

```tsx
<Avatar src="https://example.com/avatar.jpg" alt="John Doe" />
```

### With Fallback Text

```tsx
<Avatar fallback="JD" alt="John Doe" />
```

### With Image and Fallback

```tsx
{
  /* Shows fallback if image fails to load */
}
<Avatar src="https://example.com/avatar.jpg" alt="Jane Smith" fallback="JS" />;
```

### User Initials Pattern

```tsx
const user = { name: 'Alice Johnson', avatarUrl: '' };
const initials = user.name
  .split(' ')
  .map((n) => n[0])
  .join('')
  .toUpperCase();

<Avatar fallback={initials} alt={user.name} />;
```

### Custom Styling

```tsx
<Avatar
  src="https://example.com/avatar.jpg"
  alt="User"
  className="avatar-large"
  style={{ border: '2px solid gold' }}
/>
```

### Avatar Group

```tsx
<div style={{ display: 'flex', gap: '8px' }}>
  <Avatar src="https://example.com/user1.jpg" alt="User 1" />
  <Avatar src="https://example.com/user2.jpg" alt="User 2" />
  <Avatar fallback="+5" alt="5 more users" />
</div>
```

## Accessibility

- Always provide meaningful `alt` text describing the person
- Alt text is essential for screen readers
- Fallback text is visual only; `alt` provides screen reader context
- Container is a `<div>`, not interactive by default
- For clickable avatars, wrap in a button or link

### Clickable Avatar Pattern

```tsx
<button onClick={() => openProfile(user)}>
  <Avatar src={user.avatar} alt={`View ${user.name}'s profile`} />
</button>
```

## Do's and Don'ts

### Do

- Always provide descriptive `alt` text
- Use initials or single letters for fallback
- Ensure adequate color contrast for fallback text
- Use consistent sizing across your application
- Provide fallback for images that might fail to load

### Don't

- Don't omit `alt` text
- Don't use long text as fallback (1-3 characters max)
- Don't use Avatar for non-person images (use Image component)
- Don't make Avatar interactive without proper button/link wrapper
- Don't use emojis in fallback (accessibility issues)

## Related Components

- [Image](./Image.md) - For general image display
- [Badge](./Badge.md) - Often combined with avatars for status indicators

## References

- [Source](../../src/primitives/Avatar.tsx)
