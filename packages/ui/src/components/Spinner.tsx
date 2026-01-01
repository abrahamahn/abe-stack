import type { CSSProperties, ReactElement } from 'react';

import './components.css';

/** Consider using <Loading/> instead. */
export function Spinner(props: { size?: string }): ReactElement {
  const size = props.size ?? 'var(--ui-gap-lg)';
  return <span className="ui-spinner" style={{ '--ui-spinner-size': size } as CSSProperties} />;
}
