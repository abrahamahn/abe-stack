// apps/web/src/features/demo/components/DemoComponentList.tsx
import { CloseButton, Heading, MenuItem, ScrollArea, Text } from '@abe-stack/ui';

import type { ComponentDemo } from '@demo/types';

interface DemoComponentListProps {
  components: ComponentDemo[];
  selectedComponent: ComponentDemo | null;
  onSelectComponent: (component: ComponentDemo) => void;
  onClose: () => void;
}

export const DemoComponentList = ({
  components,
  selectedComponent,
  onSelectComponent,
  onClose,
}: DemoComponentListProps): React.ReactElement => {
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
            <MenuItem
              key={comp.id}
              onClick={() => {
                onSelectComponent(comp);
              }}
              data-selected={selectedComponent?.id === comp.id}
            >
              <Text>{comp.name}</Text>
              <Text tone="muted" className="text-xs">
                {comp.variants.length} variant{comp.variants.length !== 1 ? 's' : ''}
              </Text>
            </MenuItem>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};
