// main/client/ui/src/components/Accordion.tsx
import { useControllableState } from '@hooks/useControllableState';

import { Button } from '../elements/Button';

import type { ReactElement, ReactNode } from 'react';

import '../styles/components.css';

type AccordionItem = {
  /** Unique identifier for the item */
  id: string;
  /** Accordion header content */
  title: ReactNode;
  /** Accordion panel content */
  content: ReactNode;
};

type AccordionProps = {
  /** Array of accordion items */
  items: AccordionItem[];
  /** Controlled currently open item ID */
  value?: string | null;
  /** Initially open item ID for uncontrolled usage */
  defaultValue?: string | null;
  /** Callback when opened item changes */
  onChange?: (id: string | null) => void;
};

/**
 * An accessible accordion component with single-expansion pattern.
 *
 * @example
 * ```tsx
 * <Accordion items={[
 *   { id: '1', title: 'Section 1', content: 'Content 1' },
 *   { id: '2', title: 'Section 2', content: 'Content 2' },
 * ]} />
 * ```
 */
export const Accordion = ({
  items,
  value,
  defaultValue = null,
  onChange,
}: AccordionProps): ReactElement => {
  const [openId, setOpenId] = useControllableState<string | null>({
    ...(value !== undefined && { value }),
    defaultValue,
    ...(onChange !== undefined && { onChange }),
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
              <Button
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
              </Button>
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
};
