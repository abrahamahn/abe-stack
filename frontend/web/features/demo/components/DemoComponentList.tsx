import { Button, Heading, ScrollArea, Text } from '@ui';

import type { ComponentDemo } from '../types';

const closeButtonStyle = {
  textDecoration: 'none',
  padding: 0,
  minWidth: 'auto',
  alignSelf: 'flex-start',
  marginTop: '-2px',
  marginRight: '-4px',
  lineHeight: 1,
};

interface DemoComponentListProps {
  components: ComponentDemo[];
  selectedComponent: ComponentDemo | null;
  layoutBorder: string;
  onSelectComponent: (component: ComponentDemo) => void;
  onClose: () => void;
}

export function DemoComponentList({
  components,
  selectedComponent,
  layoutBorder,
  onSelectComponent,
  onClose,
}: DemoComponentListProps): React.ReactElement {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        height: '100%',
        borderRight: layoutBorder,
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '16px',
        }}
      >
        <Heading as="h2" size="md">
          Components
        </Heading>
        <Button
          size="small"
          variant="text"
          aria-label="Collapse left panel"
          onClick={onClose}
          style={closeButtonStyle}
        >
          ✕
        </Button>
      </div>
      <ScrollArea style={{ flex: 1, minHeight: 0 }}>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
            padding: '8px',
          }}
        >
          {components.map((comp) => (
            <button
              key={comp.id}
              onClick={() => {
                onSelectComponent(comp);
              }}
              className="demo-menu-item"
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
                padding: '12px',
                textAlign: 'left',
                width: '100%',
                background:
                  selectedComponent?.id === comp.id
                    ? 'var(--ui-color-surface-hover, rgba(0,0,0,0.08))'
                    : 'transparent',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                transition: 'background 0.15s ease',
              }}
            >
              <Text>{comp.name}</Text>
              <Text tone="muted" style={{ fontSize: '12px' }}>
                {comp.variants.length} variant{comp.variants.length !== 1 ? 's' : ''}
              </Text>
            </button>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
