import React from 'react';

import '../styles/components.css';

type BadgeTone = 'success' | 'danger' | 'warning' | 'neutral';

export function Badge(props: {
  children: React.ReactNode;
  tone?: BadgeTone;
  className?: string;
  style?: React.CSSProperties;
  onClick?: React.MouseEventHandler;
  onKeyDown?: React.KeyboardEventHandler;
  tabIndex?: 0 | -1;
}): React.ReactElement {
  const { tone, className, style, children, onClick, onKeyDown, tabIndex } = props;
  return (
    <div
      className={`ui-badge ${className ?? ''}`.trim()}
      data-tone={tone}
      style={style}
      tabIndex={tabIndex}
      onClick={onClick}
      onKeyDown={onKeyDown}
    >
      {children}
    </div>
  );
}
