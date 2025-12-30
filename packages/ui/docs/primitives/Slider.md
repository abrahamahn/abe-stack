# Slider

## Overview

An accessible range slider component for selecting numeric values within a defined range, supporting both controlled and uncontrolled patterns.

## Import

```tsx
import { Slider } from 'abeahn-ui/primitives';
```

## Props

| Prop         | Type                                | Default     | Description                                              |
| ------------ | ----------------------------------- | ----------- | -------------------------------------------------------- |
| value        | `number`                            | -           | Controlled value                                         |
| defaultValue | `number`                            | `min` value | Initial value for uncontrolled usage                     |
| onChange     | `(value: number) => void`           | -           | Callback when value changes (receives number, not event) |
| min          | `number`                            | `0`         | Minimum value                                            |
| max          | `number`                            | `100`       | Maximum value                                            |
| step         | `number`                            | `1`         | Step increment                                           |
| className    | `string`                            | `''`        | Additional CSS classes to apply                          |
| ...rest      | `ComponentPropsWithoutRef<'input'>` | -           | All standard HTML `<input type="range">` attributes      |
| ref          | `Ref<HTMLInputElement>`             | -           | Forwarded ref to the `<input>` element                   |

## Usage

### Basic Example

```tsx
<Slider />
```

### Controlled

```tsx
const [volume, setVolume] = useState(50);

<Slider value={volume} onChange={setVolume} min={0} max={100} />;
```

### With Default Value

```tsx
<Slider defaultValue={75} />
```

### Custom Range

```tsx
<Slider min={0} max={10} step={0.5} defaultValue={5} />
```

### With Label and Value Display

```tsx
const [brightness, setBrightness] = useState(80);

<div>
  <label htmlFor="brightness">Brightness: {brightness}%</label>
  <Slider id="brightness" value={brightness} onChange={setBrightness} min={0} max={100} />
</div>;
```

### Temperature Control Example

```tsx
const [temp, setTemp] = useState(22);

<div>
  <label htmlFor="temp">Temperature: {temp}°C</label>
  <Slider id="temp" value={temp} onChange={setTemp} min={16} max={30} step={0.5} />
</div>;
```

### Disabled State

```tsx
<Slider value={50} disabled />
```

### Price Range

```tsx
const [price, setPrice] = useState(500);

<div>
  <label>Max Price: ${price}</label>
  <Slider value={price} onChange={setPrice} min={0} max={1000} step={50} />
</div>;
```

### With Marks/Steps

```tsx
const [rating, setRating] = useState(3);

<div>
  <label>Rating: {rating}/5</label>
  <Slider value={rating} onChange={setRating} min={1} max={5} step={1} />
  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
    {[1, 2, 3, 4, 5].map((n) => (
      <span key={n}>{n}</span>
    ))}
  </div>
</div>;
```

## Accessibility

- Uses native `<input type="range">` element
- Keyboard accessible (Arrow keys to adjust, Home/End for min/max)
- Screen readers announce current value
- Supports ARIA attributes via spread props
- Should always have an associated label

### Recommended Labeling

```tsx
{/* Option 1: visible label */}
<label htmlFor="volume">Volume</label>
<Slider id="volume" value={volume} onChange={setVolume} />

{/* Option 2: aria-label */}
<Slider
  value={volume}
  onChange={setVolume}
  aria-label="Volume control"
/>

{/* Option 3: aria-labelledby */}
<span id="volume-label">Volume</span>
<Slider
  value={volume}
  onChange={setVolume}
  aria-labelledby="volume-label"
/>
```

### With Value Announcements

```tsx
<Slider
  value={brightness}
  onChange={setBrightness}
  aria-label="Brightness"
  aria-valuetext={`${brightness} percent`}
/>
```

## Do's and Don'ts

### Do

- Always provide accessible labels
- Display the current value visually
- Use appropriate `min`, `max`, and `step` values
- Consider mobile touch target sizes
- Provide visual feedback during interaction
- Use `step` for discrete values (e.g., ratings, sizes)

### Don't

- Don't use slider for text input or selection
- Don't make the range too granular (avoid tiny steps)
- Don't forget to display units (%, $, °C, etc.)
- Don't rely solely on slider for precise input (provide text input alternative)
- Don't use slider when exact values are critical (use Input instead)

## Related Components

- [Input](../components/Input.md) - For precise numeric input
- [Progress](./Progress.md) - For displaying progress (not interactive)

## References

- [Source](../../src/primitives/Slider.tsx)
- [Tests](../../src/primitives/__tests__/Slider.test.tsx)
- [Hooks: useControllableState](../../src/hooks/useControllableState.ts)
- [MDN: input type="range"](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input/range)
