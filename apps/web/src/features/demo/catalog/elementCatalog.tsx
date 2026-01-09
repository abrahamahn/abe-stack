// apps/web/src/features/demo/catalog/elementCatalog.tsx
import {
  Alert,
  Avatar,
  Badge,
  Box,
  Button,
  Checkbox,
  CloseButton,
  Divider,
  EnvironmentBadge,
  Heading,
  Input,
  Kbd,
  MenuItem,
  Progress,
  Skeleton,
  Spinner,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Text,
  TextArea,
  Toaster,
  Tooltip,
  VersionBadge,
  VisuallyHidden,
} from '@abe-stack/ui';

import type { ComponentDemo } from '../types';

export const elementCatalog: Record<string, ComponentDemo> = {
  alert: {
    id: 'alert',
    name: 'Alert',
    category: 'elements',
    description: 'Alert message component for feedback',
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
        name: 'Danger',
        description: 'Danger alert',
        code: '<Alert tone="danger">Error message</Alert>',
        render: () => <Alert tone="danger">Error message</Alert>,
      },
    ],
  },
  avatar: {
    id: 'avatar',
    name: 'Avatar',
    category: 'elements',
    description: 'User avatar with image or initials fallback',
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
    ],
  },
  badge: {
    id: 'badge',
    name: 'Badge',
    category: 'elements',
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
  box: {
    id: 'box',
    name: 'Box',
    category: 'elements',
    description: 'Generic flex container with padding and direction controls',
    variants: [
      {
        name: 'Column',
        description: 'Vertical layout',
        code: '<Box padding="16px">...</Box>',
        render: () => (
          <Box padding="16px" style={{ gap: '8px', border: '1px dashed #ccc' }}>
            <Button>Item 1</Button>
            <Button>Item 2</Button>
          </Box>
        ),
      },
      {
        name: 'Row',
        description: 'Horizontal layout',
        code: '<Box flexDirection="row" padding="16px">...</Box>',
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
    category: 'elements',
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
  closeButton: {
    id: 'closeButton',
    name: 'CloseButton',
    category: 'elements',
    description: 'Close button with X icon',
    variants: [
      {
        name: 'Default',
        description: 'Default close button',
        code: '<CloseButton onClick={() => {}} />',
        render: () => <CloseButton onClick={() => {}} aria-label="Close" />,
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
    ],
  },
  environmentBadge: {
    id: 'environmentBadge',
    name: 'EnvironmentBadge',
    category: 'elements',
    description: 'Badge showing current environment (dev, staging, prod)',
    variants: [
      {
        name: 'Development',
        description: 'Development environment',
        code: '<EnvironmentBadge environment="development" />',
        render: () => <EnvironmentBadge environment="development" />,
      },
      {
        name: 'Staging',
        description: 'Staging environment',
        code: '<EnvironmentBadge environment="staging" />',
        render: () => <EnvironmentBadge environment="staging" />,
      },
      {
        name: 'Production',
        description: 'Production environment',
        code: '<EnvironmentBadge environment="production" />',
        render: () => <EnvironmentBadge environment="production" />,
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
  input: {
    id: 'input',
    name: 'Input',
    category: 'elements',
    description: 'Text input field component',
    variants: [
      {
        name: 'Basic',
        description: 'Basic text input',
        code: '<Input placeholder="Enter text" />',
        render: () => <Input placeholder="Enter text" />,
      },
      {
        name: 'Email',
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
  kbd: {
    id: 'kbd',
    name: 'Kbd',
    category: 'elements',
    description: 'Keyboard key indicator',
    variants: [
      {
        name: 'Single Key',
        description: 'Single keyboard key',
        code: '<Kbd>⌘</Kbd>',
        render: () => <Kbd>⌘</Kbd>,
      },
      {
        name: 'Shortcut',
        description: 'Keyboard shortcut',
        code: '<><Kbd>⌘</Kbd> + <Kbd>K</Kbd></>',
        render: () => (
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Kbd>⌘</Kbd>
            <span>+</span>
            <Kbd>K</Kbd>
          </span>
        ),
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
        name: '100%',
        description: 'Progress at 100%',
        code: '<Progress value={100} />',
        render: () => <Progress value={100} />,
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
  spinner: {
    id: 'spinner',
    name: 'Spinner',
    category: 'elements',
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
  toaster: {
    id: 'toaster',
    name: 'Toaster',
    category: 'elements',
    description: 'Toast notification container',
    variants: [
      {
        name: 'Basic',
        description: 'Toaster component (renders toast container)',
        code: '<Toaster messages={messages} onDismiss={dismiss} />',
        render: () => (
          <div style={{ position: 'relative', height: '60px' }}>
            <Text tone="muted">Toaster renders a container for toast notifications.</Text>
            <Toaster messages={[]} onDismiss={() => {}} />
          </div>
        ),
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
  versionBadge: {
    id: 'versionBadge',
    name: 'VersionBadge',
    category: 'elements',
    description: 'Badge showing version number',
    variants: [
      {
        name: 'Basic',
        description: 'Version badge',
        code: '<VersionBadge version="1.0.0" />',
        render: () => <VersionBadge version="1.0.0" />,
      },
      {
        name: 'Beta',
        description: 'Beta version',
        code: '<VersionBadge version="2.0.0-beta.1" />',
        render: () => <VersionBadge version="2.0.0-beta.1" />,
      },
    ],
  },
  visuallyHidden: {
    id: 'visuallyHidden',
    name: 'VisuallyHidden',
    category: 'elements',
    description: 'Hides content visually while keeping it accessible',
    variants: [
      {
        name: 'Basic',
        description: 'Hidden content',
        code: '<VisuallyHidden>Hidden text</VisuallyHidden>',
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
};
