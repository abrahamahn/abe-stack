// apps/web/src/features/demo/catalog/componentCatalog.tsx
import {
  Accordion,
  Button,
  Card,
  Dialog,
  Dropdown,
  FormField,
  Heading,
  Image,
  Input,
  LoadingContainer,
  MenuItem,
  Pagination,
  Popover,
  Radio,
  RadioGroup,
  Select,
  Skeleton,
  Slider,
  Tabs,
  Text,
  Toast,
  ToastContainer,
} from '@abe-stack/ui';
import { useState } from 'react';

import type { ComponentDemo } from '@demo/types';
import type { ReactElement } from 'react';

// Stateful wrappers for interactive demos
function DialogDemo(): ReactElement {
  const [open, setOpen] = useState(false);
  return (
    <Dialog.Root open={open} onChange={setOpen}>
      <Dialog.Trigger>
        <Button>Open Dialog</Button>
      </Dialog.Trigger>
      <Dialog.Content title="Dialog Title">
        <Text>This is the dialog content. Press Escape or click outside to close.</Text>
      </Dialog.Content>
    </Dialog.Root>
  );
}

function ToastDemo(): ReactElement {
  const [messages, setMessages] = useState<{ id: string; title: string; description: string }[]>(
    [],
  );
  const addToast = (): void => {
    const id = Date.now().toString();
    setMessages((prev) => [
      ...prev,
      { id, title: 'Notification', description: 'This is a toast message' },
    ]);
  };
  const dismiss = (id: string): void => {
    setMessages((prev) => prev.filter((m) => m.id !== id));
  };
  return (
    <div>
      <Button onClick={addToast}>Show Toast</Button>
      <ToastContainer messages={messages} onDismiss={dismiss} />
    </div>
  );
}

export const componentCatalog: Record<string, ComponentDemo> = {
  accordion: {
    id: 'accordion',
    name: 'Accordion',
    category: 'components',
    description: 'Expandable accordion component for showing/hiding content',
    variants: [
      {
        name: 'Basic',
        description: 'Basic accordion with multiple items',
        code: `<Accordion
  items={[
    { id: '1', title: 'Section 1', content: 'Content for section 1' },
    { id: '2', title: 'Section 2', content: 'Content for section 2' },
  ]}
/>`,
        render: () => (
          <Accordion
            items={[
              {
                id: '1',
                title: 'What is this component?',
                content: (
                  <Text>
                    An accordion component for organizing content into collapsible sections.
                  </Text>
                ),
              },
              {
                id: '2',
                title: 'How do I use it?',
                content: (
                  <Text>Pass an array of items with id, title, and content properties.</Text>
                ),
              },
              {
                id: '3',
                title: 'Can I control which is open?',
                content: <Text>Yes, use the value and onChange props for controlled mode.</Text>,
              },
            ]}
          />
        ),
      },
      {
        name: 'Default Open',
        description: 'Accordion with a default open section',
        code: `<Accordion defaultValue="1" items={[...]} />`,
        render: () => (
          <Accordion
            defaultValue="1"
            items={[
              {
                id: '1',
                title: 'Open by default',
                content: <Text>This section is open by default.</Text>,
              },
              {
                id: '2',
                title: 'Click to expand',
                content: <Text>This section starts collapsed.</Text>,
              },
            ]}
          />
        ),
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
  dialog: {
    id: 'dialog',
    name: 'Dialog',
    category: 'components',
    description: 'Modal dialog component with focus trap and accessibility',
    variants: [
      {
        name: 'Basic',
        description: 'Basic dialog with trigger',
        code: `<Dialog.Root>
  <Dialog.Trigger><Button>Open</Button></Dialog.Trigger>
  <Dialog.Content title="Dialog Title">
    <Text>Dialog content</Text>
  </Dialog.Content>
</Dialog.Root>`,
        render: () => <DialogDemo />,
      },
    ],
  },
  dropdown: {
    id: 'dropdown',
    name: 'Dropdown',
    category: 'components',
    description: 'Dropdown menu component with keyboard navigation',
    variants: [
      {
        name: 'Basic',
        description: 'Basic dropdown menu',
        code: `<Dropdown trigger={<Button>Open Menu</Button>}>
  <MenuItem>Option 1</MenuItem>
  <MenuItem>Option 2</MenuItem>
</Dropdown>`,
        render: () => (
          <Dropdown trigger={<Button>Open Menu</Button>}>
            <MenuItem>Edit</MenuItem>
            <MenuItem>Duplicate</MenuItem>
            <MenuItem>Delete</MenuItem>
          </Dropdown>
        ),
      },
      {
        name: 'Right Placement',
        description: 'Dropdown with right placement',
        code: `<Dropdown placement="right" trigger={...}>...</Dropdown>`,
        render: () => (
          <Dropdown placement="right" trigger={<Button>Open Right</Button>}>
            <MenuItem>Action 1</MenuItem>
            <MenuItem>Action 2</MenuItem>
          </Dropdown>
        ),
      },
    ],
  },
  formField: {
    id: 'formField',
    name: 'FormField',
    category: 'components',
    description: 'Form field wrapper with label, error, and helper text',
    variants: [
      {
        name: 'Basic',
        description: 'Basic form field with label',
        code: `<FormField label="Email" htmlFor="email">
  <Input id="email" type="email" />
</FormField>`,
        render: () => (
          <FormField label="Email" htmlFor="demo-email">
            <Input id="demo-email" type="email" placeholder="Enter your email" />
          </FormField>
        ),
      },
      {
        name: 'Required',
        description: 'Required form field',
        code: `<FormField label="Password" htmlFor="password" required>
  <Input id="password" type="password" />
</FormField>`,
        render: () => (
          <FormField label="Password" htmlFor="demo-password" required>
            <Input id="demo-password" type="password" placeholder="Enter password" />
          </FormField>
        ),
      },
      {
        name: 'With Error',
        description: 'Form field with error message',
        code: `<FormField label="Username" htmlFor="username" error="Username is required">
  <Input id="username" />
</FormField>`,
        render: () => (
          <FormField label="Username" htmlFor="demo-username" error="Username is required">
            <Input id="demo-username" placeholder="Enter username" />
          </FormField>
        ),
      },
      {
        name: 'With Helper Text',
        description: 'Form field with helper text',
        code: `<FormField label="Bio" htmlFor="bio" helperText="Max 200 characters">
  <Input id="bio" />
</FormField>`,
        render: () => (
          <FormField label="Bio" htmlFor="demo-bio" helperText="Max 200 characters">
            <Input id="demo-bio" placeholder="Tell us about yourself" />
          </FormField>
        ),
      },
    ],
  },
  image: {
    id: 'image',
    name: 'Image',
    category: 'components',
    description: 'Image component with lazy loading and fallback support',
    variants: [
      {
        name: 'Basic',
        description: 'Basic image with lazy loading',
        code: `<Image src="/photo.jpg" alt="Description" />`,
        render: () => (
          <Image
            src="https://via.placeholder.com/300x200"
            alt="Placeholder image"
            style={{ maxWidth: '300px' }}
          />
        ),
      },
      {
        name: 'With Aspect Ratio',
        description: 'Image with fixed aspect ratio',
        code: `<Image src="/photo.jpg" alt="Photo" aspectRatio="16/9" />`,
        render: () => (
          <Image
            src="https://via.placeholder.com/400x225"
            alt="16:9 aspect ratio"
            aspectRatio="16/9"
            style={{ maxWidth: '300px' }}
          />
        ),
      },
      {
        name: 'With Fallback',
        description: 'Image with loading fallback',
        code: `<Image src="/photo.jpg" alt="Photo" fallback={<Skeleton />} />`,
        render: () => (
          <Image
            src="https://via.placeholder.com/300x200"
            alt="With fallback"
            fallback={<Skeleton style={{ width: '100%', height: '100%' }} />}
            style={{ maxWidth: '300px', height: '200px' }}
          />
        ),
      },
    ],
  },
  loadingContainer: {
    id: 'loadingContainer',
    name: 'LoadingContainer',
    category: 'components',
    description: 'Centered loading container with spinner and optional text',
    variants: [
      {
        name: 'Default',
        description: 'Default loading container',
        code: '<LoadingContainer />',
        render: () => (
          <div style={{ height: '100px', border: '1px dashed #ccc' }}>
            <LoadingContainer />
          </div>
        ),
      },
      {
        name: 'Custom Text',
        description: 'Loading container with custom text',
        code: '<LoadingContainer text="Fetching data..." />',
        render: () => (
          <div style={{ height: '100px', border: '1px dashed #ccc' }}>
            <LoadingContainer text="Fetching data..." />
          </div>
        ),
      },
      {
        name: 'Large',
        description: 'Large loading container',
        code: '<LoadingContainer size="lg" text="Please wait..." />',
        render: () => (
          <div style={{ height: '120px', border: '1px dashed #ccc' }}>
            <LoadingContainer size="lg" text="Please wait..." />
          </div>
        ),
      },
    ],
  },
  pagination: {
    id: 'pagination',
    name: 'Pagination',
    category: 'components',
    description: 'Pagination component for navigating pages',
    variants: [
      {
        name: 'Basic',
        description: 'Basic pagination',
        code: '<Pagination totalPages={5} defaultValue={1} />',
        render: () => <Pagination totalPages={5} defaultValue={1} />,
      },
      {
        name: 'Many Pages',
        description: 'Pagination with many pages',
        code: '<Pagination totalPages={10} defaultValue={5} />',
        render: () => <Pagination totalPages={10} defaultValue={5} />,
      },
    ],
  },
  popover: {
    id: 'popover',
    name: 'Popover',
    category: 'components',
    description: 'Popover component for floating content',
    variants: [
      {
        name: 'Basic',
        description: 'Basic popover',
        code: `<Popover trigger={<Button>Click me</Button>}>
  <Text>Popover content</Text>
</Popover>`,
        render: () => (
          <Popover trigger={<Button>Click me</Button>}>
            <div style={{ padding: '8px' }}>
              <Text>This is popover content</Text>
            </div>
          </Popover>
        ),
      },
      {
        name: 'Right Placement',
        description: 'Popover opening to the right',
        code: `<Popover placement="right" trigger={...}>...</Popover>`,
        render: () => (
          <Popover placement="right" trigger={<Button>Open Right</Button>}>
            <div style={{ padding: '8px' }}>
              <Text>Opens to the right</Text>
            </div>
          </Popover>
        ),
      },
    ],
  },
  radio: {
    id: 'radio',
    name: 'Radio',
    category: 'components',
    description: 'Radio button component',
    variants: [
      {
        name: 'Standalone',
        description: 'Standalone radio button',
        code: '<Radio label="Option" />',
        render: () => <Radio label="Select this option" />,
      },
      {
        name: 'Checked',
        description: 'Checked radio button',
        code: '<Radio label="Selected" defaultChecked />',
        render: () => <Radio label="Selected option" defaultChecked />,
      },
    ],
  },
  radioGroup: {
    id: 'radioGroup',
    name: 'RadioGroup',
    category: 'components',
    description: 'Group of radio buttons with keyboard navigation',
    variants: [
      {
        name: 'Basic',
        description: 'Basic radio group',
        code: `<RadioGroup defaultValue="1">
  <Radio value="1" label="Option 1" />
  <Radio value="2" label="Option 2" />
  <Radio value="3" label="Option 3" />
</RadioGroup>`,
        render: () => (
          <RadioGroup defaultValue="1" aria-label="Demo options">
            <Radio value="1" label="Option 1" />
            <Radio value="2" label="Option 2" />
            <Radio value="3" label="Option 3" />
          </RadioGroup>
        ),
      },
    ],
  },
  select: {
    id: 'select',
    name: 'Select',
    category: 'components',
    description: 'Custom select dropdown with keyboard navigation',
    variants: [
      {
        name: 'Basic',
        description: 'Basic select',
        code: `<Select>
  <option value="1">Option 1</option>
  <option value="2">Option 2</option>
  <option value="3">Option 3</option>
</Select>`,
        render: () => (
          <Select defaultValue="1">
            <option value="1">Option 1</option>
            <option value="2">Option 2</option>
            <option value="3">Option 3</option>
          </Select>
        ),
      },
      {
        name: 'With Disabled Option',
        description: 'Select with a disabled option',
        code: `<Select>
  <option value="1">Available</option>
  <option value="2" disabled>Unavailable</option>
  <option value="3">Available</option>
</Select>`,
        render: () => (
          <Select defaultValue="1">
            <option value="1">Available</option>
            <option value="2" disabled>
              Unavailable
            </option>
            <option value="3">Also Available</option>
          </Select>
        ),
      },
    ],
  },
  slider: {
    id: 'slider',
    name: 'Slider',
    category: 'components',
    description: 'Range slider component',
    variants: [
      {
        name: 'Basic',
        description: 'Basic slider',
        code: '<Slider defaultValue={50} />',
        render: () => <Slider defaultValue={50} style={{ width: '200px' }} />,
      },
      {
        name: 'Custom Range',
        description: 'Slider with custom min/max',
        code: '<Slider min={0} max={10} step={1} defaultValue={5} />',
        render: () => (
          <Slider min={0} max={10} step={1} defaultValue={5} style={{ width: '200px' }} />
        ),
      },
    ],
  },
  tabs: {
    id: 'tabs',
    name: 'Tabs',
    category: 'components',
    description: 'Tabbed interface component',
    variants: [
      {
        name: 'Basic',
        description: 'Basic tabs',
        code: `<Tabs items={[
  { id: 'tab1', label: 'Tab 1', content: 'Content 1' },
  { id: 'tab2', label: 'Tab 2', content: 'Content 2' },
]} />`,
        render: () => (
          <Tabs
            items={[
              { id: 'tab1', label: 'Overview', content: <Text>Overview content goes here.</Text> },
              { id: 'tab2', label: 'Details', content: <Text>Detailed information here.</Text> },
              { id: 'tab3', label: 'Settings', content: <Text>Settings and configuration.</Text> },
            ]}
          />
        ),
      },
    ],
  },
  toast: {
    id: 'toast',
    name: 'Toast',
    category: 'components',
    description: 'Toast notification component',
    variants: [
      {
        name: 'Interactive',
        description: 'Click to show a toast notification',
        code: `<ToastContainer messages={messages} onDismiss={dismiss} />`,
        render: () => <ToastDemo />,
      },
      {
        name: 'Static',
        description: 'Static toast example',
        code: `<Toast message={{ id: '1', title: 'Success', description: 'Action completed' }} />`,
        render: () => (
          <div style={{ position: 'relative' }}>
            <Toast
              message={{
                id: 'demo',
                title: 'Success',
                description: 'Your changes have been saved',
              }}
              duration={999999}
            />
          </div>
        ),
      },
    ],
  },
};
