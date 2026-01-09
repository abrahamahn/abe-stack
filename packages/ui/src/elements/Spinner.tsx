// packages/ui/src/elements/Spinner.tsx
import type { CSSProperties, ReactElement } from 'react';

import '../styles/elements.css';

/** Consider using <Loading/> instead. */
export function Spinner(props: { size?: string }): ReactElement {
  const size = props.size ?? 'var(--ui-gap-lg)';
  return <span className="spinner" style={{ '--ui-spinner-size': size } as CSSProperties} />;
}
