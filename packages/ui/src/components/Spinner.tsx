import type { ReactElement } from 'react';
import '../primitives/primitives.css';

/** Consider using <Loading/> instead. */
export function Spinner(props: { size?: string }): ReactElement {
  const size = props.size ?? 'var(--ui-gap-lg)';
  return <span style={{ height: size, width: size }} className="ui-spinner" />;
}
