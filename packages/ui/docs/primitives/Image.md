# Image

## Overview

An enhanced image component with lazy loading, fallback support, aspect ratio control, and loading/error state management.

## Import

```tsx
import { Image } from 'abeahn-ui/primitives';
```

## Props

| Prop        | Type                                                       | Default   | Description                                         |
| ----------- | ---------------------------------------------------------- | --------- | --------------------------------------------------- |
| src         | `string` (required)                                        | -         | Image source URL                                    |
| alt         | `string` (required)                                        | -         | Alternative text for accessibility                  |
| loading     | `'lazy' \| 'eager'`                                        | `'lazy'`  | Lazy loading behavior                               |
| fallback    | `ReactNode`                                                | -         | Content to show while loading or on error           |
| aspectRatio | `string`                                                   | `'auto'`  | CSS aspect ratio (e.g., `'16/9'`, `'4/3'`, `'1/1'`) |
| objectFit   | `'contain' \| 'cover' \| 'fill' \| 'none' \| 'scale-down'` | `'cover'` | How the image fits its container                    |
| className   | `string`                                                   | `''`      | Additional CSS classes to apply to container        |
| style       | `CSSProperties`                                            | -         | Inline styles for container                         |
| onLoad      | `(event) => void`                                          | -         | Callback when image loads successfully              |
| onError     | `(event) => void`                                          | -         | Callback when image fails to load                   |
| ...rest     | `Omit<ComponentPropsWithoutRef<'img'>, 'loading'>`         | -         | All standard `<img>` attributes                     |
| ref         | `Ref<HTMLImageElement>`                                    | -         | Forwarded ref to the `<img>` element                |

## Usage

### Basic Example

```tsx
<Image src="/photo.jpg" alt="Photo description" />
```

### With Aspect Ratio

```tsx
<Image src="/photo.jpg" alt="Landscape photo" aspectRatio="16/9" />
```

### With Skeleton Fallback

```tsx
<Image
  src="/photo.jpg"
  alt="User photo"
  aspectRatio="1/1"
  fallback={<Skeleton width="100%" height="100%" />}
/>
```

### Different Object Fit Options

```tsx
<Image
  src="/photo.jpg"
  alt="Product image"
  aspectRatio="4/3"
  objectFit="contain"  // Shows entire image
/>

<Image
  src="/photo.jpg"
  alt="Hero image"
  aspectRatio="21/9"
  objectFit="cover"    // Fills container, may crop
/>
```

### Eager Loading (Above the Fold)

```tsx
<Image
  src="/hero.jpg"
  alt="Hero banner"
  loading="eager" // Load immediately, not lazy
  aspectRatio="16/9"
/>
```

### Gallery Example

```tsx
<div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
  {photos.map((photo) => (
    <Image
      key={photo.id}
      src={photo.url}
      alt={photo.description}
      aspectRatio="1/1"
      objectFit="cover"
      fallback={<Skeleton />}
    />
  ))}
</div>
```

### Profile Avatar

```tsx
<Image
  src={user.avatarUrl}
  alt={`${user.name}'s avatar`}
  aspectRatio="1/1"
  objectFit="cover"
  style={{ borderRadius: '50%', width: '64px' }}
  fallback={<Avatar fallback={user.initials} />}
/>
```

### With Error Handling

```tsx
const [imageSrc, setImageSrc] = useState('/photo.jpg');

<Image
  src={imageSrc}
  alt="Photo"
  aspectRatio="16/9"
  onError={() => {
    console.error('Image failed to load');
    setImageSrc('/fallback-image.jpg');
  }}
  fallback={<div>Loading...</div>}
/>;
```

### Responsive Images

```tsx
<Image
  src="/photo.jpg"
  srcSet="/photo-small.jpg 480w, /photo-medium.jpg 800w, /photo-large.jpg 1200w"
  sizes="(max-width: 480px) 100vw, (max-width: 800px) 50vw, 33vw"
  alt="Responsive image"
  aspectRatio="16/9"
/>
```

## Behavior

- Shows `fallback` content while loading
- Shows `fallback` content if image fails to load
- Hides fallback and shows image once loaded successfully
- Lazy loads by default for performance
- Maintains aspect ratio without layout shift
- Wraps `<img>` in container div for positioning

## Accessibility

- **Always** requires `alt` text (enforced by TypeScript)
- Uses native `<img>` element for compatibility
- Supports all standard image attributes
- Alt text should describe the image content
- Use empty `alt=""` only for purely decorative images

### Alt Text Best Practices

```tsx
{
  /* Informative images */
}
<Image src="/chart.jpg" alt="Sales chart showing 30% growth in Q4" />;

{
  /* Decorative images */
}
<Image src="/decoration.jpg" alt="" />;

{
  /* Functional images (buttons/links) */
}
<Image src="/search-icon.jpg" alt="Search" />;

{
  /* Images of text */
}
<Image src="/logo-text.jpg" alt="Company Name Inc." />;
```

## Do's and Don'ts

### Do

- Always provide meaningful `alt` text
- Use `aspectRatio` to prevent layout shift
- Provide `fallback` for better UX
- Use `loading="eager"` for above-the-fold images
- Use appropriate `objectFit` for your use case
- Optimize images before using (compression, sizing)
- Use `srcSet` for responsive images

### Don't

- Don't omit `alt` text
- Don't use images for text content
- Don't use too large aspect ratios without fallback
- Don't lazy-load critical above-the-fold images
- Don't rely solely on image content for information (provide text alternatives)
- Don't use image for decorative purposes without `alt=""`

## Object Fit Guide

| Value             | Behavior                            | Use Case                |
| ----------------- | ----------------------------------- | ----------------------- |
| `cover` (default) | Fills container, may crop           | Thumbnails, hero images |
| `contain`         | Entire image visible, may letterbox | Product images, logos   |
| `fill`            | Stretches to fill container         | Backgrounds             |
| `none`            | Original size                       | Icons                   |
| `scale-down`      | Smaller of `none` or `contain`      | Flexible sizing         |

## Related Components

- [Skeleton](./Skeleton.md) - For loading placeholders
- [Avatar](./Avatar.md) - For user profile images

## References

- [Source](../../src/primitives/Image.tsx)
- [Tests](../../src/primitives/__tests__/Image.test.tsx)
- [MDN: img element](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/img)
- [MDN: lazy loading](https://developer.mozilla.org/en-US/docs/Web/Performance/Lazy_loading#images_and_iframes)
