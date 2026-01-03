import { Button, Heading, Text } from '@abe-stack/ui';

import { getComponentDocs, parseMarkdown } from '../docs';

import type { ComponentDemo } from '../types';
import type { ReactElement } from 'react';

const closeButtonStyle = {
  textDecoration: 'none',
  padding: 0,
  minWidth: 'auto',
  alignSelf: 'flex-start',
  marginTop: '-2px',
  marginRight: '-4px',
  lineHeight: 1,
};

interface DemoDocPanelProps {
  selectedComponent: ComponentDemo | null;
  layoutBorder: string;
  onClose: () => void;
}

export function DemoDocPanel({
  selectedComponent,
  layoutBorder,
  onClose,
}: DemoDocPanelProps): React.ReactElement {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        height: '100%',
        borderLeft: layoutBorder,
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
          Documentation
        </Heading>
        <Button
          size="small"
          variant="text"
          aria-label="Collapse right panel"
          onClick={onClose}
          style={closeButtonStyle}
        >
          ✕
        </Button>
      </div>
      <div
        style={{
          padding: '16px',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
        }}
      >
        {selectedComponent ? (
          <DocumentationContent component={selectedComponent} />
        ) : (
          <Text tone="muted">Select a component to view documentation</Text>
        )}
      </div>
    </div>
  );
}

function DocumentationContent({ component }: { component: ComponentDemo }): ReactElement {
  const docs = getComponentDocs(component.id, component.category, component.name);

  if (docs) {
    return <div dangerouslySetInnerHTML={{ __html: parseMarkdown(docs) }} />;
  }

  return (
    <>
      <section>
        <Heading as="h3" size="sm">
          Description
        </Heading>
        <Text>{component.description}</Text>
      </section>
      <section>
        <Heading as="h3" size="sm">
          Category
        </Heading>
        <Text>{component.category}</Text>
      </section>
      <section>
        <Heading as="h3" size="sm">
          Variants
        </Heading>
        <Text>{component.variants.length} available</Text>
      </section>
    </>
  );
}
