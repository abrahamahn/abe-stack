// src/client/ui/src/elements/Spinner.tsx
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
  /** Additional class names */
  className?: string;
  /** ARIA role (defaults to status for loading indicators) */
  role?: string;
}): ReactElement => {
  const size = props.size ?? 'var(--ui-gap-lg)';
  const className = `spinner ${props.className ?? ''}`.trim();
  const role = props.role ?? 'status';

  return (
    <span
      className={className}
      role={role}
      {...(role === 'status' && { ['aria-live']: 'polite' })}
      style={{ ['--ui-spinner-size']: size } as CSSProperties}
    />
  );
};
