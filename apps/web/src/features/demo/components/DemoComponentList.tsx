import { CloseButton, Heading, ScrollArea, Text } from '@abe-stack/ui';

import type { ComponentDemo } from '@demo/types';

interface DemoComponentListProps {
  components: ComponentDemo[];
  selectedComponent: ComponentDemo | null;
  onSelectComponent: (component: ComponentDemo) => void;
  onClose: () => void;
}

export function DemoComponentList({
  components,
  selectedComponent,
  onSelectComponent,
  onClose,
}: DemoComponentListProps): React.ReactElement {
  return (
    <div className="panel border-r">
      <div className="panel-header">
        <Heading as="h2" size="md">
          Components
        </Heading>
        <CloseButton aria-label="Collapse left panel" onClick={onClose} />
      </div>
      <ScrollArea className="scroll-flex">
        <div className="flex-col gap-1 p-2">
          {components.map((comp) => (
            <button
              key={comp.id}
              onClick={() => {
                onSelectComponent(comp);
              }}
              className="menu-item"
              data-selected={selectedComponent?.id === comp.id}
            >
              <Text>{comp.name}</Text>
              <Text tone="muted" className="text-xs">
                {comp.variants.length} variant{comp.variants.length !== 1 ? 's' : ''}
              </Text>
            </button>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
