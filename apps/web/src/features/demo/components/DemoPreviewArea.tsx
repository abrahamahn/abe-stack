import { Button, Heading, ScrollArea, Text } from '@abe-stack/ui';

import type { ComponentDemo } from '../types';

interface DemoPreviewAreaProps {
  selectedComponent: ComponentDemo | null;
  isMobile: boolean;
}

export function DemoPreviewArea({
  selectedComponent,
  isMobile,
}: DemoPreviewAreaProps): React.ReactElement {
  return (
    <div
      style={{
        flex: 1,
        minWidth: 0,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <ScrollArea style={{ flex: 1, minHeight: 0 }}>
        <div
          style={{
            minHeight: '100%',
            display: 'flex',
            flexDirection: 'column',
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
            <div>
              <Heading as="h2" size="md">
                {selectedComponent ? selectedComponent.name : 'Select a component'}
              </Heading>
              {selectedComponent && <Text tone="muted">{selectedComponent.description}</Text>}
            </div>
          </div>

          {selectedComponent ? (
            <VariantGrid component={selectedComponent} isMobile={isMobile} />
          ) : (
            <EmptyState />
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

function VariantGrid({
  component,
  isMobile,
}: {
  component: ComponentDemo;
  isMobile: boolean;
}): React.ReactElement {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(320px, 1fr))',
        gap: isMobile ? '16px' : '24px',
        padding: isMobile ? '16px' : '24px',
        alignContent: 'start',
      }}
    >
      {component.variants.map((variant, idx) => (
        <VariantCard key={idx} variant={variant} />
      ))}
    </div>
  );
}

function VariantCard({
  variant,
}: {
  variant: ComponentDemo['variants'][number];
}): React.ReactElement {
  return (
    <div
      style={{
        border: '1px solid currentColor',
        borderRadius: '8px',
        padding: '16px',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginBottom: '16px',
        }}
      >
        <div>
          <Heading as="h3" size="sm">
            {variant.name}
          </Heading>
          <Text tone="muted" style={{ fontSize: '14px' }}>
            {variant.description}
          </Text>
        </div>
        <Button
          size="small"
          variant="text"
          className="demo-copy-button"
          onClick={() => {
            void navigator.clipboard.writeText(variant.code);
          }}
          title="Copy code"
        >
          📋
        </Button>
      </div>
      <div
        style={{
          padding: '24px',
          border: '1px dashed currentColor',
          borderRadius: '4px',
          marginBottom: '16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '80px',
          gap: '16px',
          flexWrap: 'wrap',
        }}
      >
        {variant.render()}
      </div>
      <details style={{ marginTop: '16px' }}>
        <summary style={{ cursor: 'pointer', padding: '8px' }}>View Code</summary>
        <pre style={{ margin: '8px 0 0', padding: '12px', overflowX: 'auto' }}>
          <code>{variant.code}</code>
        </pre>
      </details>
    </div>
  );
}

function EmptyState(): React.ReactElement {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        padding: '48px',
        textAlign: 'center',
      }}
    >
      <Text tone="muted">Select a component from the left sidebar to view demos</Text>
    </div>
  );
}
