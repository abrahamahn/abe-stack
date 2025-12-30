// apps/web/src/demo/registry.tsx
import {
  Accordion,
  Alert,
  Avatar,
  Badge,
  Button,
  Card,
  Checkbox,
  Dialog,
  Divider,
  Dropdown,
  Heading,
  Image,
  Input,
  Modal,
  Overlay,
  Pagination,
  Popover,
  Progress,
  Radio,
  RadioGroup,
  ResizablePanel,
  ResizablePanelGroup,
  ScrollArea,
  Select,
  Skeleton,
  Slider,
  Spinner,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Tabs,
  Text,
  TextArea,
  Toast,
  Tooltip,
} from '@abe-stack/ui';
import React from 'react';

import type { ComponentDemo } from './types';

export const componentRegistry: Record<string, ComponentDemo> = {
  // Components
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

  // Primitives
  accordion: {
    id: 'accordion',
    name: 'Accordion',
    category: 'primitives',
    description: 'Expandable accordion component',
    variants: [
      {
        name: 'Basic',
        description: 'Basic accordion with items',
        code: '<Accordion items={[...]} />',
        render: () => (
          <Accordion
            items={[
              { id: '1', title: 'Section 1', content: 'Content for section 1' },
              { id: '2', title: 'Section 2', content: 'Content for section 2' },
              { id: '3', title: 'Section 3', content: 'Content for section 3' },
            ]}
          />
        ),
      },
    ],
  },
  alert: {
    id: 'alert',
    name: 'Alert',
    category: 'primitives',
    description: 'Alert message component',
    variants: [
      {
        name: 'Info',
        description: 'Info alert',
        code: '<Alert variant="info">Information message</Alert>',
        render: () => <Alert variant="info">Information message</Alert>,
      },
      {
        name: 'Success',
        description: 'Success alert',
        code: '<Alert variant="success">Success message</Alert>',
        render: () => <Alert variant="success">Success message</Alert>,
      },
      {
        name: 'Warning',
        description: 'Warning alert',
        code: '<Alert variant="warning">Warning message</Alert>',
        render: () => <Alert variant="warning">Warning message</Alert>,
      },
      {
        name: 'Error',
        description: 'Error alert',
        code: '<Alert variant="error">Error message</Alert>',
        render: () => <Alert variant="error">Error message</Alert>,
      },
    ],
  },
  avatar: {
    id: 'avatar',
    name: 'Avatar',
    category: 'primitives',
    description: 'User avatar component',
    variants: [
      {
        name: 'With Initials',
        description: 'Avatar with initials',
        code: '<Avatar name="John Doe" />',
        render: () => <Avatar name="John Doe" />,
      },
      {
        name: 'Small',
        description: 'Small avatar',
        code: '<Avatar name="JD" size="small" />',
        render: () => <Avatar name="JD" size="small" />,
      },
      {
        name: 'Large',
        description: 'Large avatar',
        code: '<Avatar name="JD" size="large" />',
        render: () => <Avatar name="JD" size="large" />,
      },
    ],
  },
  checkbox: {
    id: 'checkbox',
    name: 'Checkbox',
    category: 'primitives',
    description: 'Checkbox input component',
    variants: [
      {
        name: 'Unchecked',
        description: 'Unchecked checkbox',
        code: '<Checkbox label="Option" onChange={() => {}} />',
        render: () => <Checkbox label="Unchecked option" onChange={() => {}} />,
      },
      {
        name: 'Checked',
        description: 'Checked checkbox',
        code: '<Checkbox checked label="Option" onChange={() => {}} />',
        render: () => <Checkbox checked label="Checked option" onChange={() => {}} />,
      },
      {
        name: 'Disabled',
        description: 'Disabled checkbox',
        code: '<Checkbox disabled label="Disabled" onChange={() => {}} />',
        render: () => <Checkbox disabled label="Disabled option" onChange={() => {}} />,
      },
    ],
  },
  divider: {
    id: 'divider',
    name: 'Divider',
    category: 'primitives',
    description: 'Visual divider line',
    variants: [
      {
        name: 'Horizontal',
        description: 'Horizontal divider',
        code: '<Divider />',
        render: () => <Divider />,
      },
      {
        name: 'Vertical',
        description: 'Vertical divider',
        code: '<Divider orientation="vertical" />',
        render: () => (
          <div style={{ height: '50px', display: 'flex', alignItems: 'center' }}>
            <Divider orientation="vertical" />
          </div>
        ),
      },
    ],
  },
  dropdown: {
    id: 'dropdown',
    name: 'Dropdown',
    category: 'primitives',
    description: 'Dropdown menu component',
    variants: [
      {
        name: 'Basic',
        description: 'Basic dropdown',
        code: '<Dropdown trigger={<Button>Menu</Button>}>...</Dropdown>',
        render: () => (
          <Dropdown trigger={<Button>Open Menu</Button>}>
            {(close) => (
              <div style={{ padding: '8px', display: 'grid', gap: '4px' }}>
                <Button variant="text" onClick={close}>
                  Item 1
                </Button>
                <Button variant="text" onClick={close}>
                  Item 2
                </Button>
                <Button variant="text" onClick={close}>
                  Item 3
                </Button>
              </div>
            )}
          </Dropdown>
        ),
      },
    ],
  },
  heading: {
    id: 'heading',
    name: 'Heading',
    category: 'primitives',
    description: 'Heading text component',
    variants: [
      {
        name: 'H1',
        description: 'Level 1 heading',
        code: '<Heading as="h1">Heading 1</Heading>',
        render: () => <Heading as="h1">Heading 1</Heading>,
      },
      {
        name: 'H2',
        description: 'Level 2 heading',
        code: '<Heading as="h2">Heading 2</Heading>',
        render: () => <Heading as="h2">Heading 2</Heading>,
      },
      {
        name: 'H3',
        description: 'Level 3 heading',
        code: '<Heading as="h3">Heading 3</Heading>',
        render: () => <Heading as="h3">Heading 3</Heading>,
      },
    ],
  },
  modal: {
    id: 'modal',
    name: 'Modal',
    category: 'primitives',
    description: 'Modal dialog component',
    variants: [
      {
        name: 'Basic',
        description: 'Basic modal',
        code: '<Modal open={true} onClose={() => {}}>...</Modal>',
        render: (): JSX.Element => {
          const [open, setOpen] = React.useState(false);
          return (
            <>
              <Button
                onClick={() => {
                  setOpen(true);
                }}
              >
                Open Modal
              </Button>
              <Modal
                open={open}
                onClose={() => {
                  setOpen(false);
                }}
              >
                <div style={{ padding: '24px' }}>
                  <Heading as="h2">Modal Title</Heading>
                  <Text>Modal content goes here</Text>
                  <Button
                    onClick={() => {
                      setOpen(false);
                    }}
                    style={{ marginTop: '16px' }}
                  >
                    Close
                  </Button>
                </div>
              </Modal>
            </>
          );
        },
      },
    ],
  },
  overlay: {
    id: 'overlay',
    name: 'Overlay',
    category: 'primitives',
    description: 'Overlay backdrop component',
    variants: [
      {
        name: 'Basic',
        description: 'Basic overlay',
        code: '<Overlay visible={true} />',
        render: (): JSX.Element => {
          const [visible, setVisible] = React.useState(false);
          return (
            <>
              <Button
                onClick={() => {
                  setVisible(!visible);
                }}
              >
                Toggle Overlay
              </Button>
              <Overlay
                visible={visible}
                onClick={() => {
                  setVisible(false);
                }}
              />
            </>
          );
        },
      },
    ],
  },
  pagination: {
    id: 'pagination',
    name: 'Pagination',
    category: 'primitives',
    description: 'Pagination component',
    variants: [
      {
        name: 'Basic',
        description: 'Basic pagination',
        code: '<Pagination currentPage={1} totalPages={10} onPageChange={() => {}} />',
        render: () => <Pagination currentPage={1} totalPages={10} onPageChange={() => {}} />,
      },
    ],
  },
  popover: {
    id: 'popover',
    name: 'Popover',
    category: 'primitives',
    description: 'Popover component',
    variants: [
      {
        name: 'Basic',
        description: 'Basic popover',
        code: '<Popover trigger={<Button>Click</Button>}>Content</Popover>',
        render: () => (
          <Popover trigger={<Button>Open Popover</Button>}>
            <div style={{ padding: '12px' }}>
              <Text>Popover content here</Text>
            </div>
          </Popover>
        ),
      },
    ],
  },
  progress: {
    id: 'progress',
    name: 'Progress',
    category: 'primitives',
    description: 'Progress bar component',
    variants: [
      {
        name: '25%',
        description: 'Progress at 25%',
        code: '<Progress value={25} />',
        render: () => <Progress value={25} />,
      },
      {
        name: '50%',
        description: 'Progress at 50%',
        code: '<Progress value={50} />',
        render: () => <Progress value={50} />,
      },
      {
        name: '75%',
        description: 'Progress at 75%',
        code: '<Progress value={75} />',
        render: () => <Progress value={75} />,
      },
      {
        name: '100%',
        description: 'Progress at 100%',
        code: '<Progress value={100} />',
        render: () => <Progress value={100} />,
      },
    ],
  },
  radio: {
    id: 'radio',
    name: 'Radio',
    category: 'primitives',
    description: 'Radio button component',
    variants: [
      {
        name: 'Unchecked',
        description: 'Unchecked radio',
        code: '<Radio name="radio" label="Option" onChange={() => {}} />',
        render: () => <Radio name="demo-radio" label="Unchecked" onChange={() => {}} />,
      },
      {
        name: 'Checked',
        description: 'Checked radio',
        code: '<Radio checked name="radio" label="Option" onChange={() => {}} />',
        render: () => <Radio checked name="demo-radio-2" label="Checked" onChange={() => {}} />,
      },
    ],
  },
  radioGroup: {
    id: 'radioGroup',
    name: 'RadioGroup',
    category: 'primitives',
    description: 'Radio button group component',
    variants: [
      {
        name: 'Basic',
        description: 'Basic radio group',
        code: '<RadioGroup options={[...]} value="1" onChange={() => {}} />',
        render: () => (
          <RadioGroup
            options={[
              { value: '1', label: 'Option 1' },
              { value: '2', label: 'Option 2' },
              { value: '3', label: 'Option 3' },
            ]}
            value="1"
            onChange={() => {}}
          />
        ),
      },
    ],
  },
  select: {
    id: 'select',
    name: 'Select',
    category: 'primitives',
    description: 'Select dropdown component',
    variants: [
      {
        name: 'Basic',
        description: 'Basic select',
        code: '<Select><option>One</option><option>Two</option></Select>',
        render: () => (
          <Select aria-label="Select option">
            <option>Option 1</option>
            <option>Option 2</option>
            <option>Option 3</option>
          </Select>
        ),
      },
      {
        name: 'Disabled',
        description: 'Disabled select',
        code: '<Select disabled><option>One</option></Select>',
        render: () => (
          <Select disabled aria-label="Disabled select">
            <option>Disabled</option>
          </Select>
        ),
      },
    ],
  },
  skeleton: {
    id: 'skeleton',
    name: 'Skeleton',
    category: 'primitives',
    description: 'Loading skeleton component',
    variants: [
      {
        name: 'Text',
        description: 'Text skeleton',
        code: '<Skeleton style={{ width: 200, height: 16 }} />',
        render: () => <Skeleton style={{ width: 200, height: 16 }} />,
      },
      {
        name: 'Block',
        description: 'Block skeleton',
        code: '<Skeleton style={{ width: 300, height: 100 }} />',
        render: () => <Skeleton style={{ width: 300, height: 100 }} />,
      },
    ],
  },
  slider: {
    id: 'slider',
    name: 'Slider',
    category: 'primitives',
    description: 'Range slider component',
    variants: [
      {
        name: 'Basic',
        description: 'Basic slider',
        code: '<Slider value={50} onChange={() => {}} />',
        render: () => <Slider value={50} onChange={() => {}} />,
      },
      {
        name: 'With Min/Max',
        description: 'Slider with min and max',
        code: '<Slider min={0} max={200} value={100} onChange={() => {}} />',
        render: () => <Slider min={0} max={200} value={100} onChange={() => {}} />,
      },
    ],
  },
  switch: {
    id: 'switch',
    name: 'Switch',
    category: 'primitives',
    description: 'Toggle switch component',
    variants: [
      {
        name: 'Off',
        description: 'Switch off',
        code: '<Switch checked={false} onChange={() => {}} />',
        render: () => <Switch checked={false} onChange={() => {}} />,
      },
      {
        name: 'On',
        description: 'Switch on',
        code: '<Switch checked={true} onChange={() => {}} />',
        render: () => <Switch checked={true} onChange={() => {}} />,
      },
      {
        name: 'Disabled',
        description: 'Disabled switch',
        code: '<Switch disabled onChange={() => {}} />',
        render: () => <Switch disabled onChange={() => {}} />,
      },
    ],
  },
  tabs: {
    id: 'tabs',
    name: 'Tabs',
    category: 'primitives',
    description: 'Tabbed navigation component',
    variants: [
      {
        name: 'Basic',
        description: 'Basic tabs',
        code: '<Tabs items={[...]} />',
        render: () => (
          <Tabs
            items={[
              { id: 'tab1', label: 'Tab 1', content: <div>Content 1</div> },
              { id: 'tab2', label: 'Tab 2', content: <div>Content 2</div> },
              { id: 'tab3', label: 'Tab 3', content: <div>Content 3</div> },
            ]}
          />
        ),
      },
    ],
  },
  text: {
    id: 'text',
    name: 'Text',
    category: 'primitives',
    description: 'Text component with tones',
    variants: [
      {
        name: 'Default',
        description: 'Default text',
        code: '<Text>Default text</Text>',
        render: () => <Text>Default text</Text>,
      },
      {
        name: 'Muted',
        description: 'Muted text',
        code: '<Text tone="muted">Muted text</Text>',
        render: () => <Text tone="muted">Muted text</Text>,
      },
      {
        name: 'Brand',
        description: 'Brand text',
        code: '<Text tone="brand">Brand text</Text>',
        render: () => <Text tone="brand">Brand text</Text>,
      },
    ],
  },
  textarea: {
    id: 'textarea',
    name: 'TextArea',
    category: 'primitives',
    description: 'Multi-line text input',
    variants: [
      {
        name: 'Basic',
        description: 'Basic textarea',
        code: '<TextArea placeholder="Enter text" />',
        render: () => <TextArea placeholder="Enter multiple lines of text" />,
      },
      {
        name: 'With Rows',
        description: 'Textarea with custom rows',
        code: '<TextArea rows={5} placeholder="Enter text" />',
        render: () => <TextArea rows={5} placeholder="Enter text" />,
      },
    ],
  },
  tooltip: {
    id: 'tooltip',
    name: 'Tooltip',
    category: 'primitives',
    description: 'Tooltip component',
    variants: [
      {
        name: 'Basic',
        description: 'Basic tooltip',
        code: '<Tooltip content="Tooltip text"><Button>Hover</Button></Tooltip>',
        render: () => (
          <Tooltip content="This is a helpful tooltip">
            <Button>Hover me</Button>
          </Tooltip>
        ),
      },
    ],
  },
  table: {
    id: 'table',
    name: 'Table',
    category: 'primitives',
    description: 'Data table component',
    variants: [
      {
        name: 'Basic',
        description: 'Basic table',
        code: '<Table>...</Table>',
        render: () => (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell>John Doe</TableCell>
                <TableCell>john@example.com</TableCell>
                <TableCell>Admin</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Jane Smith</TableCell>
                <TableCell>jane@example.com</TableCell>
                <TableCell>User</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        ),
      },
    ],
  },
  toast: {
    id: 'toast',
    name: 'Toast',
    category: 'primitives',
    description: 'Toast notification component',
    variants: [
      {
        name: 'Info',
        description: 'Info toast',
        code: '<Toast variant="info" onClose={() => {}}>Message</Toast>',
        render: () => <Toast variant="info">Information message</Toast>,
      },
      {
        name: 'Success',
        description: 'Success toast',
        code: '<Toast variant="success" onClose={() => {}}>Success!</Toast>',
        render: () => <Toast variant="success">Success message</Toast>,
      },
      {
        name: 'Error',
        description: 'Error toast',
        code: '<Toast variant="error" onClose={() => {}}>Error!</Toast>',
        render: () => <Toast variant="error">Error message</Toast>,
      },
    ],
  },
  resizablePanel: {
    id: 'resizablePanel',
    name: 'ResizablePanel',
    category: 'primitives',
    description: 'Resizable panel layout',
    variants: [
      {
        name: 'Horizontal',
        description: 'Horizontal resizable panels',
        code: '<ResizablePanelGroup>...</ResizablePanelGroup>',
        render: () => (
          <ResizablePanelGroup direction="horizontal" style={{ height: '200px' }}>
            <ResizablePanel defaultSize={50}>
              <div style={{ padding: '16px' }}>
                <Text>Left Panel</Text>
              </div>
            </ResizablePanel>
            <div style={{ padding: '16px' }}>
              <Text>Right Panel</Text>
            </div>
          </ResizablePanelGroup>
        ),
      },
    ],
  },
  scrollArea: {
    id: 'scrollArea',
    name: 'ScrollArea',
    category: 'primitives',
    description: 'Custom scrollable area',
    variants: [
      {
        name: 'Basic',
        description: 'Basic scroll area',
        code: '<ScrollArea style={{ height: 200 }}>...</ScrollArea>',
        render: () => (
          <ScrollArea style={{ height: 200, border: '1px solid #ddd', padding: '12px' }}>
            <div>
              {Array.from({ length: 20 }, (_, i) => (
                <Text key={i} style={{ display: 'block', marginBottom: '8px' }}>
                  Scrollable content line {i + 1}
                </Text>
              ))}
            </div>
          </ScrollArea>
        ),
      },
    ],
  },
  dialog: {
    id: 'dialog',
    name: 'Dialog',
    category: 'primitives',
    description: 'Dialog component',
    variants: [
      {
        name: 'Basic',
        description: 'Basic dialog',
        code: '<Dialog open={true} onClose={() => {}}>...</Dialog>',
        render: (): JSX.Element => {
          const [open, setOpen] = React.useState(false);
          return (
            <>
              <Button
                onClick={() => {
                  setOpen(true);
                }}
              >
                Open Dialog
              </Button>
              <Dialog
                open={open}
                onClose={() => {
                  setOpen(false);
                }}
              >
                <div style={{ padding: '24px' }}>
                  <Heading as="h3">Dialog Title</Heading>
                  <Text>Dialog content</Text>
                  <Button
                    onClick={() => {
                      setOpen(false);
                    }}
                    style={{ marginTop: '16px' }}
                  >
                    Close
                  </Button>
                </div>
              </Dialog>
            </>
          );
        },
      },
    ],
  },
  image: {
    id: 'image',
    name: 'Image',
    category: 'primitives',
    description: 'Image component',
    variants: [
      {
        name: 'Basic',
        description: 'Basic image',
        code: '<Image src="..." alt="Description" />',
        render: () => (
          <Image
            src="https://via.placeholder.com/150"
            alt="Placeholder image"
            style={{ borderRadius: '8px' }}
          />
        ),
      },
    ],
  },
};

export const getComponentsByCategory = (category: string): ComponentDemo[] => {
  return Object.values(componentRegistry).filter((comp) => comp.category === category);
};

export const getAllCategories = (): string[] => {
  return Array.from(new Set(Object.values(componentRegistry).map((comp) => comp.category)));
};
