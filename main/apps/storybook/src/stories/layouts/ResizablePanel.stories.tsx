// main/apps/storybook/src/stories/layouts/ResizablePanel.stories.tsx
import { ResizablePanel, ResizablePanelGroup, Text } from '@bslt/ui';

import type { Meta, StoryObj } from '@storybook/react';
import type { ComponentProps } from 'react';

const meta: Meta<typeof ResizablePanel> = {
  title: 'Layouts/ResizablePanel',
  component: ResizablePanel,
  tags: ['autodocs'],
  argTypes: {
    defaultSize: { control: { type: 'range', min: 10, max: 90, step: 5 } },
    minSize: { control: { type: 'range', min: 5, max: 50, step: 5 } },
    maxSize: { control: { type: 'range', min: 50, max: 95, step: 5 } },
    direction: { control: 'radio', options: ['horizontal', 'vertical'] },
    collapsed: { control: 'boolean' },
  },
};
export default meta;

type Story = StoryObj<typeof ResizablePanel>;

/** Colored region placeholder for panels. */
function PanelContent({
  label,
  bg = 'var(--ui-color-surface)',
}: {
  label: string;
  bg?: string;
}): React.ReactElement {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        minHeight: '4rem',
        backgroundColor: bg,
        borderRadius: 'var(--ui-radius-sm)',
        padding: 'var(--ui-gap-md)',
      }}
    >
      <Text tone="muted" style={{ fontSize: 'var(--ui-font-size-sm)' }}>
        {label}
      </Text>
    </div>
  );
}

export const HorizontalTwoPanels: Story = {
  render: () => (
    <div
      style={{
        height: '300px',
        border: '1px solid var(--ui-color-border)',
        borderRadius: 'var(--ui-radius-md)',
      }}
    >
      <ResizablePanelGroup direction="horizontal">
        <ResizablePanel defaultSize={30} minSize={15} maxSize={60}>
          <PanelContent label="Left Panel (30%)" />
        </ResizablePanel>
        <div style={{ flex: 1 }}>
          <PanelContent label="Right Panel (flex)" bg="var(--ui-color-bg)" />
        </div>
      </ResizablePanelGroup>
    </div>
  ),
};

export const HorizontalThreePanels: Story = {
  render: () => (
    <div
      style={{
        height: '300px',
        border: '1px solid var(--ui-color-border)',
        borderRadius: 'var(--ui-radius-md)',
      }}
    >
      <ResizablePanelGroup direction="horizontal">
        <ResizablePanel defaultSize={25} minSize={15} maxSize={40}>
          <PanelContent label="Sidebar" />
        </ResizablePanel>
        <div style={{ flex: 1 }}>
          <PanelContent label="Main Content" bg="var(--ui-color-bg)" />
        </div>
        <ResizablePanel defaultSize={25} minSize={15} maxSize={40} invertResize>
          <PanelContent label="Details" />
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  ),
};

export const VerticalPanels: Story = {
  render: () => (
    <div
      style={{
        height: '400px',
        border: '1px solid var(--ui-color-border)',
        borderRadius: 'var(--ui-radius-md)',
      }}
    >
      <ResizablePanelGroup direction="vertical">
        <ResizablePanel defaultSize={30} minSize={10} maxSize={50} direction="vertical">
          <PanelContent label="Top Panel" />
        </ResizablePanel>
        <div style={{ flex: 1 }}>
          <PanelContent label="Bottom Panel" bg="var(--ui-color-bg)" />
        </div>
      </ResizablePanelGroup>
    </div>
  ),
};

export const CollapsedPanel: Story = {
  render: () => (
    <div
      style={{
        height: '300px',
        border: '1px solid var(--ui-color-border)',
        borderRadius: 'var(--ui-radius-md)',
      }}
    >
      <ResizablePanelGroup direction="horizontal">
        <ResizablePanel defaultSize={30} minSize={15} maxSize={60} collapsed>
          <PanelContent label="Collapsed Panel" />
        </ResizablePanel>
        <div style={{ flex: 1 }}>
          <PanelContent label="Main Content (sidebar collapsed)" bg="var(--ui-color-bg)" />
        </div>
      </ResizablePanelGroup>
    </div>
  ),
};

export const WithControls: Story = {
  args: {
    defaultSize: 30,
    minSize: 15,
    maxSize: 60,
    direction: 'horizontal',
    collapsed: false,
  },
  render: (args: ComponentProps<typeof ResizablePanel>) => (
    <div
      style={{
        height: '300px',
        border: '1px solid var(--ui-color-border)',
        borderRadius: 'var(--ui-radius-md)',
      }}
    >
      <ResizablePanelGroup direction={args.direction}>
        <ResizablePanel {...args}>
          <PanelContent label={`Panel (${String(args.defaultSize)}%)`} />
        </ResizablePanel>
        <div style={{ flex: 1 }}>
          <PanelContent label="Remaining Space" bg="var(--ui-color-bg)" />
        </div>
      </ResizablePanelGroup>
    </div>
  ),
};
