# Progress

## Overview

A progress bar component for displaying determinate progress (0-100%) with proper ARIA attributes for accessibility.

## Import

```tsx
import { Progress } from 'abeahn-ui/primitives';
```

## Props

| Prop      | Type                              | Default | Description                                          |
| --------- | --------------------------------- | ------- | ---------------------------------------------------- |
| value     | `number` (required)               | -       | Progress value between 0-100 (clamped automatically) |
| className | `string`                          | `''`    | Additional CSS classes to apply                      |
| ...rest   | `ComponentPropsWithoutRef<'div'>` | -       | All standard HTML `<div>` attributes                 |
| ref       | `Ref<HTMLDivElement>`             | -       | Forwarded ref to the container `<div>` element       |

## Usage

### Basic Example

```tsx
<Progress value={50} />
```

### Different Progress Values

```tsx
<Progress value={0} />    {/* Empty */}
<Progress value={25} />   {/* Quarter */}
<Progress value={50} />   {/* Half */}
<Progress value={75} />   {/* Three quarters */}
<Progress value={100} />  {/* Complete */}
```

### With Label

```tsx
const progress = 65;

<div>
  <div style={{ marginBottom: '8px' }}>
    <span>Uploading...</span>
    <span style={{ float: 'right' }}>{progress}%</span>
  </div>
  <Progress value={progress} />
</div>;
```

### File Upload Example

```tsx
const [uploadProgress, setUploadProgress] = useState(0);

<div>
  <label id="upload-label">Upload Progress</label>
  <Progress value={uploadProgress} aria-labelledby="upload-label" />
  <div>{uploadProgress}% complete</div>
</div>;
```

### Multi-step Process

```tsx
const currentStep = 2;
const totalSteps = 5;
const progress = (currentStep / totalSteps) * 100;

<div>
  <div>
    Step {currentStep} of {totalSteps}
  </div>
  <Progress value={progress} />
</div>;
```

### Auto-clamping Values

```tsx
{/* Values are automatically clamped to 0-100 range */}
<Progress value={-10} />   {/* Renders as 0 */}
<Progress value={150} />   {/* Renders as 100 */}
```

## Accessibility

- Uses `role="progressbar"` for proper semantics
- Includes `aria-valuenow`, `aria-valuemin`, and `aria-valuemax` attributes
- Screen readers announce current progress value
- Values automatically clamped to valid 0-100 range
- Consider adding `aria-label` or `aria-labelledby` for context

### With Accessible Label

```tsx
<Progress value={progress} aria-label={`Download progress: ${progress}%`} />
```

### With Associated Label

```tsx
<div>
  <label id="process-label">Processing your request</label>
  <Progress value={progress} aria-labelledby="process-label" aria-describedby="process-desc" />
  <span id="process-desc">{progress}% complete</span>
</div>
```

## Do's and Don'ts

### Do

- Use for determinate progress (known completion percentage)
- Provide visible percentage or status text
- Update progress smoothly and frequently
- Use aria-label or aria-labelledby for context
- Complete the progress bar (reach 100%) when done
- Consider animation for better perceived performance

### Don't

- Don't use for indeterminate progress (use [Spinner](../components/Spinner.md) instead)
- Don't update too frequently (causes visual noise)
- Don't leave incomplete progress bars visible after completion
- Don't use progress bars for very quick operations (<1 second)
- Don't fake progress (always reflect actual state)
- Don't rely solely on color to convey status

## Related Components

- [Spinner](../components/Spinner.md) - For indeterminate loading states
- [Skeleton](./Skeleton.md) - For content loading placeholders

## References

- [Source](../../src/primitives/Progress.tsx)
- [Tests](../../src/primitives/__tests__/Progress.test.tsx)
- [ARIA: progressbar role](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Roles/progressbar_role)
- [MDN: progress element](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/progress)
