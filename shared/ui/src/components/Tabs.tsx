// shared/ui/src/components/Tabs.tsx
import { useState, type ReactElement, type ReactNode } from 'react';
import '../styles/components.css';

export type TabItem = {
  /** Unique identifier for the tab */
  id: string;
  /** Tab label text */
  label: string;
  /** Tab panel content */
  content: ReactNode;
};

export type TabsProps = {
  /** Array of tab items */
  items: TabItem[];
  /** Controlled active tab ID */
  value?: string;
  /** Initially active tab ID for uncontrolled usage */
  defaultValue?: string;
  /** Callback when active tab changes */
  onChange?: (id: string) => void;
};

/**
 * An accessible tabbed interface with keyboard navigation.
 *
 * @example
 * ```tsx
 * <Tabs items={[
 *   { id: 'tab1', label: 'Tab 1', content: <p>Content 1</p> },
 *   { id: 'tab2', label: 'Tab 2', content: <p>Content 2</p> },
 * ]} />
 * ```
 */
export const Tabs = ({ items, value, defaultValue, onChange }: TabsProps): ReactElement => {
  const [activeId, setActiveId] = useState<string>(() => defaultValue ?? items[0]?.id ?? '');
  const currentId = value ?? activeId;

  const active = items.find((item) => item.id === currentId) ?? items[0];

  const move = (dir: 1 | -1): void => {
    if (items.length === 0) return;
    const currentIndex = items.findIndex((i) => i.id === currentId);
    const safeIndex = currentIndex >= 0 ? currentIndex : 0;
    const nextIndex = (safeIndex + dir + items.length) % items.length;
    const nextItem = items[nextIndex];
    if (nextItem != null) {
      if (value === undefined) setActiveId(nextItem.id);
      onChange?.(nextItem.id);
    }
  };

  const jumpTo = (index: number): void => {
    const item = items[index];
    if (item != null) {
      if (value === undefined) setActiveId(item.id);
      onChange?.(item.id);
    }
  };

  return (
    <div className="tabs">
      <div className="tab-list" role="tablist">
        {items.map((item) => {
          const isActive = item.id === active?.id;
          const tabId = `tab-${item.id}`;
          const panelId = `tabpanel-${item.id}`;

          return (
            <button
              key={item.id}
              id={tabId}
              className="tab"
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
      {active != null ? (
        <div
          id={`tabpanel-${active.id}`}
          className="tab-panel"
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
