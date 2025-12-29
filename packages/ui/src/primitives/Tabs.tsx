import { useState, type ReactElement, type ReactNode } from 'react';
import './primitives.css';

type TabItem = {
  id: string;
  label: string;
  content: ReactNode;
};

type TabsProps = {
  items: TabItem[];
  value?: string;
  defaultValue?: string;
  onChange?: (id: string) => void;
};

export function Tabs({ items, value, defaultValue, onChange }: TabsProps): ReactElement {
  const [activeId, setActiveId] = useState<string>(() => defaultValue ?? items[0]?.id ?? '');
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
      onChange?.(nextItem.id);
    }
  };

  const jumpTo = (index: number): void => {
    const item = items[index];
    if (item) {
      if (value === undefined) setActiveId(item.id);
      onChange?.(item.id);
    }
  };

  return (
    <div className="ui-tabs">
      <div className="ui-tab-list" role="tablist">
        {items.map((item) => {
          const isActive = item.id === active?.id;
          const tabId = `tab-${item.id}`;
          const panelId = `tabpanel-${item.id}`;

          return (
            <button
              key={item.id}
              id={tabId}
              className="ui-tab"
              role="tab"
              type="button"
              aria-selected={isActive}
              aria-controls={panelId}
              tabIndex={isActive ? 0 : -1}
              data-active={isActive}
              onClick={() => {
                setActiveId(item.id);
                onChange?.(item.id);
              }}
              onKeyDown={(e) => {
                if (e.key === 'ArrowRight') {
                  e.preventDefault();
                  move(1);
                } else if (e.key === 'ArrowLeft') {
                  e.preventDefault();
                  move(-1);
                } else if (e.key === 'Home') {
                  e.preventDefault();
                  jumpTo(0);
                } else if (e.key === 'End') {
                  e.preventDefault();
                  jumpTo(items.length - 1);
                }
              }}
            >
              {item.label}
            </button>
          );
        })}
      </div>
      {active ? (
        <div
          id={`tabpanel-${active.id}`}
          className="ui-tab-panel"
          role="tabpanel"
          aria-labelledby={`tab-${active.id}`}
          tabIndex={0}
        >
          {active.content}
        </div>
      ) : null}
    </div>
  );
}
