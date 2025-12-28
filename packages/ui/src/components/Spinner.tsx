import type { ReactElement } from 'react';

/** Consider using <Loading/> instead. */
export function Spinner(props: { size?: string }): ReactElement {
  return <span style={{ height: props.size, width: props.size }} className="spinner"></span>;
}
