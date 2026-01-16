// packages/ui/src/components/Accordion.tsx
import { useControllableState } from '@hooks/useControllableState';
import { type ReactElement, type ReactNode } from 'react';

import '../styles/components.css';

type AccordionItem = {
  id: string;
  title: ReactNode;
  content: ReactNode;
};

type AccordionProps = {
  items: AccordionItem[];
  value?: string | null;
  defaultValue?: string | null;
  onChange?: (id: string | null) => void;
};

export function Accordion({
  items,
  value,
  defaultValue = null,
  onChange,
}: AccordionProps): ReactElement {
  const [openId, setOpenId] = useControllableState<string | null>({
    value: value ?? undefined,
    defaultValue,
    onChange,
  });

  return (
    <div className="accordion">
      {items.map((item, index) => {
        const domId = `${item.id}-${String(index)}`;
        const isOpen = item.id === openId;
        const headerId = `accordion-header-${domId}`;
        const panelId = `accordion-panel-${domId}`;

        return (
          <div className="accordion-item" key={domId}>
            <h3 className="accordion-heading">
              <button
                type="button"
                id={headerId}
                className="accordion-header"
                aria-expanded={isOpen}
                aria-controls={panelId}
                onClick={() => {
                  setOpenId(isOpen ? null : item.id);
                }}
              >
                <span>{item.title}</span>
                <span aria-hidden="true">{isOpen ? '−' : '+'}</span>
              </button>
            </h3>
            {isOpen ? (
              <div
                id={panelId}
                role="region"
                aria-labelledby={headerId}
                className="accordion-content"
              >
                {item.content}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
