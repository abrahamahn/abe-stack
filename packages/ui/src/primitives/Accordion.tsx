import { type ReactElement, type ReactNode } from 'react';

import { useControllableState } from '../hooks/useControllableState';
import './primitives.css';

type AccordionItem = {
  id: string;
  title: ReactNode;
  content: ReactNode;
};

type AccordionProps = {
  items: AccordionItem[];
  defaultOpenId?: string | null;
  value?: string | null;
  onValueChange?: (id: string | null) => void;
};

export function Accordion({
  items,
  defaultOpenId = null,
  value,
  onValueChange,
}: AccordionProps): ReactElement {
  const [openId, setOpenId] = useControllableState<string | null>({
    value: value ?? undefined,
    defaultValue: defaultOpenId,
    onChange: onValueChange,
  });

  return (
    <div className="ui-accordion">
      {items.map((item) => {
        const isOpen = item.id === openId;
        return (
          <div className="ui-accordion-item" key={item.id}>
            <button
              className="ui-accordion-header"
              aria-expanded={isOpen}
              onClick={() => {
                setOpenId(isOpen ? null : item.id);
              }}
            >
              <span>{item.title}</span>
              <span>{isOpen ? '−' : '+'}</span>
            </button>
            {isOpen ? <div className="ui-accordion-content">{item.content}</div> : null}
          </div>
        );
      })}
    </div>
  );
}
