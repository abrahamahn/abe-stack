// packages/ui/src/elements/Spinner.tsx
import type { CSSProperties, ReactElement } from 'react';

import '../styles/elements.css';

/**
 * A simple loading spinner for indicating indeterminate loading states.
 *
 * @example
 * ```tsx
 * <Spinner size="24px" />
 * ```
 */
export const Spinner = (props: {
  /** Size of the spinner (CSS value) */
  size?: string;
}): ReactElement => {
  const size = props.size ?? 'var(--ui-gap-lg)';
  return <span className="spinner" style={{ ['--ui-spinner-size']: size } as CSSProperties} />;
};
