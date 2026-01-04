// apps/web/src/features/demo/catalog/componentCatalog.tsx
import { AppShell, Badge, Box, Button, Card, Heading, Input, Spinner, Text } from '@abe-stack/ui';

import type { ComponentDemo } from '@demo/types';
import type { ReactElement } from 'react';

export const componentCatalog: Record<string, ComponentDemo> = {
  box: {
    id: 'box',
    name: 'Box',
    category: 'components',
    description: 'Generic flex container with padding and direction controls',
    variants: [
      {
        name: 'Vertical (Column)',
        description: 'Default vertical layout',
        code: '<Box padding="16px" style={{ gap: "8px" }}><Button>1</Button><Button>2</Button></Box>',
        render: () => (
          <Box padding="16px" style={{ gap: '8px', border: '1px dashed #ccc' }}>
            <Button>Item 1</Button>
            <Button>Item 2</Button>
          </Box>
        ),
      },
      {
        name: 'Horizontal (Row)',
        description: 'Horizontal row layout',
        code: '<Box flexDirection="row" padding="16px" style={{ gap: "8px" }}><Button>1</Button><Button>2</Button></Box>',
        render: () => (
          <Box flexDirection="row" padding="16px" style={{ gap: '8px', border: '1px dashed #ccc' }}>
            <Button>Item 1</Button>
            <Button>Item 2</Button>
          </Box>
        ),
      },
    ],
  },
  button: {
    id: 'button',
    name: 'Button',
    category: 'components',
    description: 'Interactive button component with variants and sizes',
    variants: [
      {
        name: 'Primary',
        description: 'Default primary button',
        code: '<Button>Primary Button</Button>',
        render: () => <Button>Primary Button</Button>,
      },
      {
        name: 'Secondary',
        description: 'Secondary button variant',
        code: '<Button variant="secondary">Secondary</Button>',
        render: () => <Button variant="secondary">Secondary Button</Button>,
      },
      {
        name: 'Text',
        description: 'Text button variant',
        code: '<Button variant="text">Text Button</Button>',
        render: () => <Button variant="text">Text Button</Button>,
      },
      {
        name: 'Small',
        description: 'Small size button',
        code: '<Button size="small">Small</Button>',
        render: () => <Button size="small">Small Button</Button>,
      },
      {
        name: 'Large',
        description: 'Large size button',
        code: '<Button size="large">Large</Button>',
        render: () => <Button size="large">Large Button</Button>,
      },
      {
        name: 'Disabled',
        description: 'Disabled state',
        code: '<Button disabled>Disabled</Button>',
        render: () => <Button disabled>Disabled Button</Button>,
      },
    ],
  },
  card: {
    id: 'card',
    name: 'Card',
    category: 'components',
    description: 'Container component for grouping related content',
    variants: [
      {
        name: 'Basic',
        description: 'Basic card with content',
        code: '<Card><Text>Card content</Text></Card>',
        render: () => (
          <Card>
            <Text>Card content goes here</Text>
          </Card>
        ),
      },
      {
        name: 'With Heading',
        description: 'Card with heading and content',
        code: '<Card><Heading as="h3">Title</Heading><Text>Content</Text></Card>',
        render: () => (
          <Card>
            <Heading as="h3" size="md">
              Card Title
            </Heading>
            <Text>Card content with a heading</Text>
          </Card>
        ),
      },
    ],
  },
  input: {
    id: 'input',
    name: 'Input',
    category: 'components',
    description: 'Text input field component',
    variants: [
      {
        name: 'Basic',
        description: 'Basic text input',
        code: '<Input placeholder="Enter text" />',
        render: () => <Input placeholder="Enter text" />,
      },
      {
        name: 'With Type',
        description: 'Email input',
        code: '<Input type="email" placeholder="Email" />',
        render: () => <Input type="email" placeholder="Email" />,
      },
      {
        name: 'Disabled',
        description: 'Disabled input',
        code: '<Input disabled placeholder="Disabled" />',
        render: () => <Input disabled placeholder="Disabled" />,
      },
    ],
  },
  spinner: {
    id: 'spinner',
    name: 'Spinner',
    category: 'components',
    description: 'Loading spinner component',
    variants: [
      {
        name: 'Basic',
        description: 'Basic loading spinner',
        code: '<Spinner />',
        render: () => <Spinner />,
      },
    ],
  },
  appShell: {
    id: 'appShell',
    name: 'AppShell',
    category: 'components',
    description: 'A responsive app shell with header, sidebar, aside, and footer slots',
    variants: [
      {
        name: 'Full Layout',
        description: 'All slots provided',
        code: '<AppShell header="..." sidebar="..." aside="..." footer="...">Content</AppShell>',
        render: (): ReactElement => (
          <div style={{ height: '300px', border: '1px solid #ddd', overflow: 'hidden' }}>
            <AppShell
              header={
                <div style={{ background: '#eee', padding: '8px', textAlign: 'center' }}>
                  Header
                </div>
              }
              footer={
                <div style={{ background: '#eee', padding: '8px', textAlign: 'center' }}>
                  Footer
                </div>
              }
              sidebar={
                <div style={{ background: '#f9f9f9', padding: '8px', width: '100px' }}>Sidebar</div>
              }
              aside={
                <div style={{ background: '#f9f9f9', padding: '8px', width: '100px' }}>Aside</div>
              }
              style={{ minHeight: '100%', height: '100%' }}
            >
              <div style={{ padding: '16px' }}>Main Content</div>
            </AppShell>
          </div>
        ),
      },
    ],
  },
  badge: {
    id: 'badge',
    name: 'Badge',
    category: 'components',
    description: 'Small badge component for labels and counts',
    variants: [
      {
        name: 'Default',
        description: 'Default badge',
        code: '<Badge>Default</Badge>',
        render: () => <Badge>Default</Badge>,
      },
      {
        name: 'Success',
        description: 'Success tone badge',
        code: '<Badge tone="success">Success</Badge>',
        render: () => <Badge tone="success">Success</Badge>,
      },
      {
        name: 'Danger',
        description: 'Danger tone badge',
        code: '<Badge tone="danger">Danger</Badge>',
        render: () => <Badge tone="danger">Danger</Badge>,
      },
      {
        name: 'Warning',
        description: 'Warning tone badge',
        code: '<Badge tone="warning">Warning</Badge>',
        render: () => <Badge tone="warning">Warning</Badge>,
      },
    ],
  },
};
