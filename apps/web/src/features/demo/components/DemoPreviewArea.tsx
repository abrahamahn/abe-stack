// apps/web/src/features/demo/components/DemoPreviewArea.tsx
import { Button, Heading, ScrollArea, Text } from '@abe-stack/ui';

import type { ComponentDemo } from '@demo/types';

interface DemoPreviewAreaProps {
  selectedComponent: ComponentDemo | null;
}

export const DemoPreviewArea = ({
  selectedComponent,
}: DemoPreviewAreaProps): React.ReactElement => {
  return (
    <div className="flex-1 min-w-0 flex-col">
      <ScrollArea className="scroll-flex">
        <div className="min-h-full flex-col">
          <div className="panel-header">
            <div>
              <Heading as="h2" size="md">
                {selectedComponent !== null ? selectedComponent.name : 'Select a component'}
              </Heading>
              {selectedComponent !== null && (
                <Text tone="muted">{selectedComponent.description}</Text>
              )}
            </div>
          </div>

          {selectedComponent !== null ? (
            <VariantGrid component={selectedComponent} />
          ) : (
            <EmptyState />
          )}
        </div>
      </ScrollArea>
    </div>
  );
};

const VariantGrid = ({ component }: { component: ComponentDemo }): React.ReactElement => {
  return (
    <div className="grid-auto">
      {component.variants.map((variant, idx) => (
        <VariantCard key={idx} variant={variant} />
      ))}
    </div>
  );
};

const VariantCard = ({
  variant,
}: {
  variant: ComponentDemo['variants'][number];
}): React.ReactElement => {
  return (
    <div className="variant-card border-current">
      <div className="variant-card-header">
        <div>
          <Heading as="h3" size="sm">
            {variant.name}
          </Heading>
          <Text tone="muted" className="text-sm">
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
      <div className="preview-box border-dashed border-current">{variant.render()}</div>
      <details className="code-details">
        <summary>View Code</summary>
        <pre>
          <code>{variant.code}</code>
        </pre>
      </details>
    </div>
  );
};

const EmptyState = (): React.ReactElement => {
  return (
    <div className="empty-state">
      <Text tone="muted">Select a component from the left sidebar to view demos</Text>
    </div>
  );
};
