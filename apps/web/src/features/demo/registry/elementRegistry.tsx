// apps/web/src/features/demo/registry/elementRegistry.tsx
import {
  Accordion,
  Alert,
  Avatar,
  Button,
  CardElement,
  Checkbox,
  Dialog,
  Divider,
  Dropdown,
  Heading,
  Image,
  MenuItem,
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
  VisuallyHidden,
} from '@abe-stack/ui';
import React, { type ReactElement } from 'react';

import type { ComponentDemo } from '../types';

export const elementRegistry: Record<string, ComponentDemo> = {
  accordion: {
    id: 'accordion',
    name: 'Accordion',
    category: 'elements',
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
    category: 'elements',
    description: 'Alert message component',
    variants: [
      {
        name: 'Info',
        description: 'Info alert',
        code: '<Alert tone="info">Information message</Alert>',
        render: () => <Alert tone="info">Information message</Alert>,
      },
      {
        name: 'Success',
        description: 'Success alert',
        code: '<Alert tone="success">Success message</Alert>',
        render: () => <Alert tone="success">Success message</Alert>,
      },
      {
        name: 'Warning',
        description: 'Warning alert',
        code: '<Alert tone="warning">Warning message</Alert>',
        render: () => <Alert tone="warning">Warning message</Alert>,
      },
      {
        name: 'Error',
        description: 'Error alert',
        code: '<Alert tone="danger">Error message</Alert>',
        render: () => <Alert tone="danger">Error message</Alert>,
      },
    ],
  },
  avatar: {
    id: 'avatar',
    name: 'Avatar',
    category: 'elements',
    description: 'User avatar component',
    variants: [
      {
        name: 'With Initials',
        description: 'Avatar with initials',
        code: '<Avatar fallback="JD" />',
        render: () => <Avatar fallback="JD" />,
      },
      {
        name: 'With Image',
        description: 'Avatar with image',
        code: '<Avatar src="https://via.placeholder.com/40" alt="User" />',
        render: () => <Avatar src="https://via.placeholder.com/40" alt="User" />,
      },
      {
        name: 'With Custom Fallback',
        description: 'Avatar with custom fallback',
        code: '<Avatar fallback="AB" />',
        render: () => <Avatar fallback="AB" />,
      },
    ],
  },
  cardElement: {
    id: 'cardElement',
    name: 'Card (Advanced)',
    category: 'elements',
    description: 'Structured card with header, body, and footer slots',
    variants: [
      {
        name: 'Full Card',
        description: 'Card with all sections',
        code: '<CardElement.Root><CardElement.Header>...</CardElement.Header>...</CardElement.Root>',
        render: () => (
          <CardElement.Root style={{ width: '300px' }}>
            <CardElement.Header>
              <Heading as="h4" size="sm">
                Header
              </Heading>
            </CardElement.Header>
            <CardElement.Body>
              <Text>Main body content goes here.</Text>
            </CardElement.Body>
            <CardElement.Footer>
              <Button size="small">Action</Button>
            </CardElement.Footer>
          </CardElement.Root>
        ),
      },
    ],
  },
  checkbox: {
    id: 'checkbox',
    name: 'Checkbox',
    category: 'elements',
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
    category: 'elements',
    description: 'Visual divider line',
    variants: [
      {
        name: 'Basic',
        description: 'Horizontal divider',
        code: '<Divider />',
        render: () => <Divider />,
      },
      {
        name: 'With Custom Style',
        description: 'Divider with custom styling',
        code: '<Divider style={{ margin: "20px 0" }} />',
        render: () => <Divider style={{ margin: '20px 0' }} />,
      },
    ],
  },
  dropdown: {
    id: 'dropdown',
    name: 'Dropdown',
    category: 'elements',
    description: 'Dropdown menu component',
    variants: [
      {
        name: 'Basic',
        description: 'Basic dropdown',
        code: '<Dropdown trigger={<Button>Menu</Button>}>...</Dropdown>',
        render: () => (
          <Dropdown trigger={<Button>Open Menu</Button>}>
            {(close: () => void) => (
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
    category: 'elements',
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
  menuItem: {
    id: 'menuItem',
    name: 'MenuItem',
    category: 'elements',
    description: 'Base component for menu items',
    variants: [
      {
        name: 'Basic',
        description: 'Default menu item',
        code: '<MenuItem>Item Content</MenuItem>',
        render: () => (
          <div style={{ width: '200px', border: '1px solid #eee', padding: '4px' }}>
            <MenuItem>Menu Item 1</MenuItem>
            <MenuItem>Menu Item 2</MenuItem>
          </div>
        ),
      },
    ],
  },
  modal: {
    id: 'modal',
    name: 'Modal',
    category: 'elements',
    description: 'Modal dialog component',
    variants: [
      {
        name: 'Basic',
        description: 'Basic modal',
        code: '<Modal.Root open={open} onClose={onClose}>...</Modal.Root>',
        render: (): ReactElement => {
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
              <Modal.Root
                open={open}
                onClose={() => {
                  setOpen(false);
                }}
              >
                <div style={{ padding: '24px' }}>
                  <Modal.Title>Modal Title</Modal.Title>
                  <Text>Modal content goes here</Text>
                  <Modal.Close>
                    <Button style={{ marginTop: '16px' }}>Close</Button>
                  </Modal.Close>
                </div>
              </Modal.Root>
            </>
          );
        },
      },
    ],
  },
  overlay: {
    id: 'overlay',
    name: 'Overlay',
    category: 'elements',
    description: 'Overlay backdrop component',
    variants: [
      {
        name: 'Basic',
        description: 'Basic overlay',
        code: '<Overlay open={true} />',
        render: (): ReactElement => {
          const [open, setOpen] = React.useState(false);
          return (
            <>
              <Button
                onClick={() => {
                  setOpen(!open);
                }}
              >
                Toggle Overlay
              </Button>
              <Overlay
                open={open}
                onClick={() => {
                  setOpen(false);
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
    category: 'elements',
    description: 'Pagination component',
    variants: [
      {
        name: 'Basic',
        description: 'Basic pagination',
        code: '<Pagination value={1} totalPages={10} onChange={() => {}} />',
        render: () => <Pagination value={1} totalPages={10} onChange={() => {}} />,
      },
    ],
  },
  popover: {
    id: 'popover',
    name: 'Popover',
    category: 'elements',
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
    category: 'elements',
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
    category: 'elements',
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
    category: 'elements',
    description: 'Radio button group component',
    variants: [
      {
        name: 'Basic',
        description: 'Basic radio group',
        code: '<RadioGroup name="group"><Radio>Option 1</Radio></RadioGroup>',
        render: () => (
          <RadioGroup name="demo-group" value="1" onValueChange={() => {}}>
            <Radio name="demo-group" value="1" label="Option 1" onChange={() => {}} />
            <Radio name="demo-group" value="2" label="Option 2" onChange={() => {}} />
            <Radio name="demo-group" value="3" label="Option 3" onChange={() => {}} />
          </RadioGroup>
        ),
      },
    ],
  },
  select: {
    id: 'select',
    name: 'Select',
    category: 'elements',
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
    category: 'elements',
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
    category: 'elements',
    description: 'Range slider component',
    variants: [
      {
        name: 'Basic',
        description: 'Basic slider',
        code: '<Slider defaultValue={50} />',
        render: () => <Slider defaultValue={50} />,
      },
      {
        name: 'With Min/Max',
        description: 'Slider with min and max',
        code: '<Slider min={0} max={200} defaultValue={100} />',
        render: () => <Slider min={0} max={200} defaultValue={100} />,
      },
    ],
  },
  switch: {
    id: 'switch',
    name: 'Switch',
    category: 'elements',
    description: 'Toggle switch component',
    variants: [
      {
        name: 'Off',
        description: 'Switch off',
        code: '<Switch defaultChecked={false} />',
        render: () => <Switch defaultChecked={false} />,
      },
      {
        name: 'On',
        description: 'Switch on',
        code: '<Switch defaultChecked={true} />',
        render: () => <Switch defaultChecked={true} />,
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
    category: 'elements',
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
    category: 'elements',
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
        name: 'Success',
        description: 'Success text',
        code: '<Text tone="success">Success text</Text>',
        render: () => <Text tone="success">Success text</Text>,
      },
      {
        name: 'Danger',
        description: 'Danger text',
        code: '<Text tone="danger">Danger text</Text>',
        render: () => <Text tone="danger">Danger text</Text>,
      },
    ],
  },
  visuallyHidden: {
    id: 'visuallyHidden',
    name: 'VisuallyHidden',
    category: 'elements',
    description: 'Hides content visually while keeping it accessible to screen readers',
    variants: [
      {
        name: 'Basic',
        description: 'Hidden content',
        code: '<VisuallyHidden>Hidden from sight but not from screen readers</VisuallyHidden>',
        render: () => (
          <div>
            <Text>There is hidden text below this line:</Text>
            <VisuallyHidden>I am here for accessibility!</VisuallyHidden>
            <Text tone="muted">(Inspect the DOM to see it)</Text>
          </div>
        ),
      },
    ],
  },
  textarea: {
    id: 'textarea',
    name: 'TextArea',
    category: 'elements',
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
    category: 'elements',
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
    category: 'elements',
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
    category: 'elements',
    description: 'Toast notification component',
    variants: [
      {
        name: 'Basic',
        description: 'Basic toast',
        code: '<Toast message={{ id: "1", title: "Title", description: "Description" }} />',
        render: () => (
          <Toast
            message={{ id: '1', title: 'Notification', description: 'This is a toast message' }}
          />
        ),
      },
      {
        name: 'With Title Only',
        description: 'Toast with only title',
        code: '<Toast message={{ id: "2", title: "Success!" }} />',
        render: () => <Toast message={{ id: '2', title: 'Success!' }} />,
      },
      {
        name: 'With Description',
        description: 'Toast with title and description',
        code: '<Toast message={{ id: "3", title: "Error", description: "Something went wrong" }} />',
        render: () => (
          <Toast message={{ id: '3', title: 'Error', description: 'Something went wrong' }} />
        ),
      },
    ],
  },
  resizablePanel: {
    id: 'resizablePanel',
    name: 'ResizablePanel',
    category: 'elements',
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
    category: 'elements',
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
    category: 'elements',
    description: 'Dialog component',
    variants: [
      {
        name: 'Basic',
        description: 'Basic dialog',
        code: '<Dialog.Root><Dialog.Trigger>Open</Dialog.Trigger><Dialog.Content>...</Dialog.Content></Dialog.Root>',
        render: (): ReactElement => {
          return (
            <Dialog.Root>
              <Dialog.Trigger className="btn btn-primary btn-medium">Open Dialog</Dialog.Trigger>
              <Dialog.Content title="Dialog Title">
                <Text>This is the dialog content</Text>
              </Dialog.Content>
            </Dialog.Root>
          );
        },
      },
    ],
  },
  image: {
    id: 'image',
    name: 'Image',
    category: 'elements',
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
