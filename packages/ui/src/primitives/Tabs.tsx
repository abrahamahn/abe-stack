import { useState, type ReactElement, type ReactNode } from 'react';
import './primitives.css';

type TabItem = {
  id: string;
  label: string;
  content: ReactNode;
};

type TabsProps = {
  items: TabItem[];
  defaultId?: string;
  value?: string;
  onValueChange?: (id: string) => void;
};

export function Tabs({ items, defaultId, value, onValueChange }: TabsProps): ReactElement {
  const [activeId, setActiveId] = useState<string>(() => defaultId ?? items[0]?.id ?? '');
  const currentId = value ?? activeId;

  const active = items.find((item) => item.id === currentId) ?? items[0];

  const move = (dir: 1 | -1): void => {
    if (!items.length) return;
    const currentIndex = items.findIndex((i) => i.id === currentId);
    const safeIndex = currentIndex >= 0 ? currentIndex : 0;
    const nextIndex = (safeIndex + dir + items.length) % items.length;
    const nextItem = items[nextIndex];
    if (nextItem) {
      if (value === undefined) setActiveId(nextItem.id);
      onValueChange?.(nextItem.id);
    }
  };

  return (
    <div className="ui-tabs">
      <div className="ui-tab-list" role="tablist">
        {items.map((item) => (
          <button
            key={item.id}
            className="ui-tab"
            role="tab"
            aria-selected={item.id === active?.id}
            data-active={item.id === active?.id}
            onClick={() => {
              setActiveId(item.id);
            }}
            onKeyDown={(e) => {
              if (e.key === 'ArrowRight') {
                e.preventDefault();
                move(1);
              } else if (e.key === 'ArrowLeft') {
                e.preventDefault();
                move(-1);
              }
            }}
          >
            {item.label}
          </button>
        ))}
      </div>
      {active ? (
        <div className="ui-tab-panel" role="tabpanel">
          {active.content}
        </div>
      ) : null}
    </div>
  );
}
