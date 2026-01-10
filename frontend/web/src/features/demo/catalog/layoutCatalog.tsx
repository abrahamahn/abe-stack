// apps/web/src/features/demo/catalog/layoutCatalog.tsx
import {
  AppShell,
  AuthLayout,
  BottombarLayout,
  Button,
  Card,
  Checkbox,
  CloseButton,
  Container,
  Heading,
  Input,
  LeftSidebarLayout,
  Modal,
  Overlay,
  PageContainer,
  ResizablePanel,
  ResizablePanelGroup,
  RightSidebarLayout,
  ScrollArea,
  StackedLayout,
  Text,
  TopbarLayout,
  VersionBadge,
} from '@ui';
import { useState } from 'react';

import type { ComponentDemo } from '@demo/types';
import type { ReactElement } from 'react';

// Stateful wrappers for interactive demos
function ModalDemo(): ReactElement {
  const [open, setOpen] = useState(false);
  return (
    <div>
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
        <Modal.Header>
          <Modal.Title>Modal Title</Modal.Title>
          <Modal.Close />
        </Modal.Header>
        <Modal.Body>
          <Modal.Description>
            This is a modal dialog with focus trapping and accessibility support.
          </Modal.Description>
          <Text>Press Escape or click outside to close.</Text>
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="secondary"
            onClick={() => {
              setOpen(false);
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={() => {
              setOpen(false);
            }}
          >
            Confirm
          </Button>
        </Modal.Footer>
      </Modal.Root>
    </div>
  );
}

function OverlayDemo(): ReactElement {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <Button
        onClick={() => {
          setOpen(true);
        }}
      >
        Show Overlay
      </Button>
      <Overlay
        open={open}
        onClick={() => {
          setOpen(false);
        }}
      />
      {open && (
        <div
          style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 1001,
            background: 'white',
            padding: '24px',
            borderRadius: '8px',
          }}
        >
          <Text>Click the overlay to close</Text>
        </div>
      )}
    </div>
  );
}

export const layoutCatalog: Record<string, ComponentDemo> = {
  // Containers
  container: {
    id: 'container',
    name: 'Container',
    category: 'layouts',
    description: 'Responsive container with size variants (sm, md, lg)',
    variants: [
      {
        name: 'Small (640px)',
        description: 'Container with small max-width',
        code: `<Container size="sm">
  <Heading as="h2">Small Container</Heading>
  <Text>Content with 640px max-width</Text>
</Container>`,
        render: (): ReactElement => (
          <div
            style={{
              border: '1px solid var(--color-border)',
              padding: '20px',
              backgroundColor: 'var(--color-surface)',
            }}
          >
            <Container size="sm">
              <Card>
                <Heading as="h3" size="sm">
                  Small Container (640px)
                </Heading>
                <Text>
                  This container has a max-width of 640px. Great for narrow content like forms or
                  reading material.
                </Text>
              </Card>
            </Container>
          </div>
        ),
      },
      {
        name: 'Medium (960px)',
        description: 'Container with medium max-width (default)',
        code: `<Container size="md">
  <Heading as="h2">Medium Container</Heading>
  <Text>Content with 960px max-width (default)</Text>
</Container>`,
        render: (): ReactElement => (
          <div
            style={{
              border: '1px solid var(--color-border)',
              padding: '20px',
              backgroundColor: 'var(--color-surface)',
            }}
          >
            <Container size="md">
              <Card>
                <Heading as="h3" size="sm">
                  Medium Container (960px)
                </Heading>
                <Text>
                  This is the default container size with 960px max-width. Ideal for most content
                  layouts.
                </Text>
              </Card>
            </Container>
          </div>
        ),
      },
      {
        name: 'Large (1200px)',
        description: 'Container with large max-width',
        code: `<Container size="lg">
  <Heading as="h2">Large Container</Heading>
  <Text>Content with 1200px max-width</Text>
</Container>`,
        render: (): ReactElement => (
          <div
            style={{
              border: '1px solid var(--color-border)',
              padding: '20px',
              backgroundColor: 'var(--color-surface)',
            }}
          >
            <Container size="lg">
              <Card>
                <Heading as="h3" size="sm">
                  Large Container (1200px)
                </Heading>
                <Text>
                  This container has a max-width of 1200px. Perfect for wide layouts and dashboards.
                </Text>
              </Card>
            </Container>
          </div>
        ),
      },
    ],
  },
  authLayout: {
    id: 'authLayout',
    name: 'AuthLayout',
    category: 'layouts',
    description: 'Centered authentication layout with optional title and description',
    variants: [
      {
        name: 'Login Form',
        description: 'Authentication layout with login form',
        code: `<AuthLayout
  title="Welcome Back"
  description="Sign in to your account to continue"
>
  <Input placeholder="Email" />
  <Input type="password" placeholder="Password" />
  <Button variant="primary">Sign In</Button>
</AuthLayout>`,
        render: (): ReactElement => (
          <div style={{ minHeight: '400px', backgroundColor: 'var(--color-surface)' }}>
            <AuthLayout title="Welcome Back" description="Sign in to your account to continue">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <Input placeholder="Email" type="email" />
                <Input placeholder="Password" type="password" />
                <Button variant="primary">Sign In</Button>
              </div>
            </AuthLayout>
          </div>
        ),
      },
      {
        name: 'Sign Up Form',
        description: 'Authentication layout with registration form',
        code: `<AuthLayout
  title="Create Account"
  description="Sign up to get started"
>
  <Input placeholder="Full Name" />
  <Input placeholder="Email" />
  <Input type="password" placeholder="Password" />
  <Checkbox>I agree to the terms and conditions</Checkbox>
  <Button variant="primary">Create Account</Button>
</AuthLayout>`,
        render: (): ReactElement => (
          <div style={{ minHeight: '450px', backgroundColor: 'var(--color-surface)' }}>
            <AuthLayout title="Create Account" description="Sign up to get started">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <Input placeholder="Full Name" />
                <Input placeholder="Email" type="email" />
                <Input placeholder="Password" type="password" />
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Checkbox />
                  <Text style={{ fontSize: '14px' }}>I agree to the terms and conditions</Text>
                </div>
                <Button variant="primary">Create Account</Button>
              </div>
            </AuthLayout>
          </div>
        ),
      },
    ],
  },
  pageContainer: {
    id: 'pageContainer',
    name: 'PageContainer',
    category: 'layouts',
    description: 'Page container layout with max-width and padding',
    variants: [
      {
        name: 'Basic',
        description: 'Basic page container with default settings',
        code: `<PageContainer>
  <Heading as="h1">Page Title</Heading>
  <Text>Page content with consistent padding and max-width</Text>
</PageContainer>`,
        render: (): ReactElement => (
          <div style={{ border: '1px solid var(--color-border)', minHeight: '200px' }}>
            <PageContainer>
              <Heading as="h2" size="md">
                Page Title
              </Heading>
              <Text>
                This content is wrapped in a PageContainer which provides consistent padding and a
                max-width for readability.
              </Text>
              <Card>
                <Text>Cards and other components work well inside PageContainer</Text>
              </Card>
            </PageContainer>
          </div>
        ),
      },
      {
        name: 'Custom Max Width',
        description: 'PageContainer with custom max-width',
        code: `<PageContainer maxWidth={600}>
  <Heading as="h2">Narrow Content</Heading>
  <Text>Content with narrower max-width</Text>
</PageContainer>`,
        render: (): ReactElement => (
          <div style={{ border: '1px solid var(--color-border)', minHeight: '150px' }}>
            <PageContainer maxWidth={600}>
              <Heading as="h3" size="sm">
                Narrow Content
              </Heading>
              <Text>This PageContainer has a custom max-width of 600px for narrower content.</Text>
            </PageContainer>
          </div>
        ),
      },
    ],
  },
  stackedLayout: {
    id: 'stackedLayout',
    name: 'StackedLayout',
    category: 'layouts',
    description: 'Simple stacked layout with optional hero section',
    variants: [
      {
        name: 'Basic',
        description: 'Basic stacked layout without hero',
        code: `<StackedLayout>
  <Heading as="h1">Page Title</Heading>
  <Text>Your content goes here</Text>
</StackedLayout>`,
        render: (): ReactElement => (
          <div
            style={{
              border: '1px solid var(--color-border)',
              backgroundColor: 'var(--color-surface)',
            }}
          >
            <StackedLayout>
              <Heading as="h2" size="md">
                Content Title
              </Heading>
              <Text>
                StackedLayout provides a simple stacked layout with a centered container and
                padding.
              </Text>
              <Card style={{ marginTop: '16px' }}>
                <Text>Content is centered with a medium-width container.</Text>
              </Card>
            </StackedLayout>
          </div>
        ),
      },
      {
        name: 'With Hero',
        description: 'Stacked layout with hero section',
        code: `<StackedLayout
  hero={
    <div>
      <Heading as="h1">Welcome</Heading>
      <Text>Hero section content</Text>
    </div>
  }
>
  <Text>Main content</Text>
</StackedLayout>`,
        render: (): ReactElement => (
          <div
            style={{
              border: '1px solid var(--color-border)',
              backgroundColor: 'var(--color-surface)',
            }}
          >
            <StackedLayout
              hero={
                <div
                  style={{
                    padding: '24px',
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    borderRadius: '8px',
                    color: 'white',
                  }}
                >
                  <Heading as="h2" size="md" style={{ color: 'white', marginBottom: '8px' }}>
                    Welcome to Our Platform
                  </Heading>
                  <Text style={{ color: 'white', opacity: 0.9 }}>
                    This is the hero section - perfect for landing pages.
                  </Text>
                </div>
              }
            >
              <Heading as="h3" size="sm">
                Main Content
              </Heading>
              <Text>The hero section appears above with extra spacing.</Text>
            </StackedLayout>
          </div>
        ),
      },
    ],
  },

  // Shells
  appShell: {
    id: 'appShell',
    name: 'AppShell',
    category: 'layouts',
    description: 'Application shell layout with header, sidebar, content, and footer slots',
    variants: [
      {
        name: 'Full Layout',
        description: 'AppShell with all slots',
        code: `<AppShell
  header={<TopbarLayout>Header</TopbarLayout>}
  sidebar={<LeftSidebarLayout>Sidebar</LeftSidebarLayout>}
  footer={<BottombarLayout>Footer</BottombarLayout>}
>
  Main Content
</AppShell>`,
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
  topbarLayout: {
    id: 'topbarLayout',
    name: 'TopbarLayout',
    category: 'layouts',
    description: 'Top navigation bar with left/center/right sections',
    variants: [
      {
        name: 'Basic',
        description: 'Basic topbar with sections',
        code: `<TopbarLayout
  left={<Button variant="text">Back</Button>}
  center={<Heading as="h3">App Title</Heading>}
  right={<Button>Settings</Button>}
/>`,
        render: (): ReactElement => (
          <TopbarLayout
            left={<Button variant="text">Back</Button>}
            center={
              <Heading as="h3" size="sm">
                App Title
              </Heading>
            }
            right={<Button size="small">Settings</Button>}
            bordered
          />
        ),
      },
      {
        name: 'Simple',
        description: 'Simple topbar with children',
        code: `<TopbarLayout>
  <Heading as="h3">Dashboard</Heading>
</TopbarLayout>`,
        render: (): ReactElement => (
          <TopbarLayout bordered>
            <div style={{ display: 'flex', alignItems: 'center', padding: '0 16px' }}>
              <Heading as="h3" size="sm">
                Dashboard
              </Heading>
            </div>
          </TopbarLayout>
        ),
      },
    ],
  },
  bottombarLayout: {
    id: 'bottombarLayout',
    name: 'BottombarLayout',
    category: 'layouts',
    description: 'Bottom status/action bar with left/center/right sections',
    variants: [
      {
        name: 'Basic',
        description: 'Basic bottombar with sections',
        code: `<BottombarLayout
  left={<VersionBadge version="1.0.0" />}
  center={<Text tone="muted">Ready</Text>}
  right={<Button size="small">Help</Button>}
/>`,
        render: (): ReactElement => (
          <BottombarLayout
            left={<VersionBadge version="1.0.0" />}
            center={
              <Text tone="muted" style={{ fontSize: '12px' }}>
                Ready
              </Text>
            }
            right={
              <Button size="small" variant="text">
                Help
              </Button>
            }
            bordered
          />
        ),
      },
    ],
  },
  leftSidebarLayout: {
    id: 'leftSidebarLayout',
    name: 'LeftSidebarLayout',
    category: 'layouts',
    description: 'Left sidebar panel with header/content sections',
    variants: [
      {
        name: 'Basic',
        description: 'Basic left sidebar',
        code: `<LeftSidebarLayout width="200px" bordered>
  <nav>Navigation items</nav>
</LeftSidebarLayout>`,
        render: (): ReactElement => (
          <div style={{ height: '200px', display: 'flex', border: '1px solid #ddd' }}>
            <LeftSidebarLayout width="180px" bordered>
              <div style={{ padding: '8px' }}>
                <Heading as="h4" size="sm" style={{ marginBottom: '16px' }}>
                  Navigation
                </Heading>
                <nav style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <Button variant="text" style={{ justifyContent: 'flex-start' }}>
                    Dashboard
                  </Button>
                  <Button variant="text" style={{ justifyContent: 'flex-start' }}>
                    Settings
                  </Button>
                  <Button variant="text" style={{ justifyContent: 'flex-start' }}>
                    Profile
                  </Button>
                </nav>
              </div>
            </LeftSidebarLayout>
            <div style={{ flex: 1, padding: '16px' }}>
              <Text>Main content area</Text>
            </div>
          </div>
        ),
      },
    ],
  },
  rightSidebarLayout: {
    id: 'rightSidebarLayout',
    name: 'RightSidebarLayout',
    category: 'layouts',
    description: 'Right sidebar/panel with header and content sections',
    variants: [
      {
        name: 'Basic',
        description: 'Basic right sidebar',
        code: `<RightSidebarLayout
  header={<Heading>Details</Heading>}
  content={<Text>Panel content</Text>}
  bordered
/>`,
        render: (): ReactElement => (
          <div style={{ height: '200px', display: 'flex', border: '1px solid #ddd' }}>
            <div style={{ flex: 1, padding: '16px' }}>
              <Text>Main content area</Text>
            </div>
            <RightSidebarLayout
              width="200px"
              bordered
              header={
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '8px',
                  }}
                >
                  <Heading as="h4" size="sm">
                    Details
                  </Heading>
                  <CloseButton onClick={() => {}} aria-label="Close" />
                </div>
              }
              content={
                <div style={{ padding: '8px' }}>
                  <Text>This is the detail panel content.</Text>
                </div>
              }
            />
          </div>
        ),
      },
    ],
  },
  resizablePanel: {
    id: 'resizablePanel',
    name: 'ResizablePanel',
    category: 'layouts',
    description: 'Resizable panel layout with drag handles',
    variants: [
      {
        name: 'Horizontal',
        description: 'Horizontal resizable panels',
        code: `<ResizablePanelGroup direction="horizontal">
  <ResizablePanel defaultSize={30} minSize={20}>
    Sidebar
  </ResizablePanel>
  <ResizablePanel defaultSize={70}>
    Main content
  </ResizablePanel>
</ResizablePanelGroup>`,
        render: (): ReactElement => (
          <div style={{ height: '200px', border: '1px solid #ddd' }}>
            <ResizablePanelGroup direction="horizontal">
              <ResizablePanel defaultSize={30} minSize={20} maxSize={50}>
                <div style={{ padding: '16px', background: '#f5f5f5', height: '100%' }}>
                  <Text>Sidebar (drag to resize)</Text>
                </div>
              </ResizablePanel>
              <ResizablePanel defaultSize={70}>
                <div style={{ padding: '16px', height: '100%' }}>
                  <Text>Main content area</Text>
                </div>
              </ResizablePanel>
            </ResizablePanelGroup>
          </div>
        ),
      },
      {
        name: 'Vertical',
        description: 'Vertical resizable panels',
        code: `<ResizablePanelGroup direction="vertical">
  <ResizablePanel defaultSize={40}>Top</ResizablePanel>
  <ResizablePanel defaultSize={60}>Bottom</ResizablePanel>
</ResizablePanelGroup>`,
        render: (): ReactElement => (
          <div style={{ height: '300px', border: '1px solid #ddd' }}>
            <ResizablePanelGroup direction="vertical">
              <ResizablePanel defaultSize={40} minSize={20} direction="vertical">
                <div style={{ padding: '16px', background: '#f5f5f5', height: '100%' }}>
                  <Text>Top panel (drag to resize)</Text>
                </div>
              </ResizablePanel>
              <ResizablePanel defaultSize={60} direction="vertical">
                <div style={{ padding: '16px', height: '100%' }}>
                  <Text>Bottom panel</Text>
                </div>
              </ResizablePanel>
            </ResizablePanelGroup>
          </div>
        ),
      },
    ],
  },

  // Layers
  modal: {
    id: 'modal',
    name: 'Modal',
    category: 'layouts',
    description: 'Modal dialog with focus trap, overlay, and compound components',
    variants: [
      {
        name: 'Interactive',
        description: 'Click to open modal dialog',
        code: `<Modal.Root open={open} onClose={handleClose}>
  <Modal.Header>
    <Modal.Title>Modal Title</Modal.Title>
    <Modal.Close />
  </Modal.Header>
  <Modal.Body>
    <Modal.Description>Description text</Modal.Description>
  </Modal.Body>
  <Modal.Footer>
    <Button onClick={handleClose}>Confirm</Button>
  </Modal.Footer>
</Modal.Root>`,
        render: () => <ModalDemo />,
      },
    ],
  },
  overlay: {
    id: 'overlay',
    name: 'Overlay',
    category: 'layouts',
    description: 'Semi-transparent overlay backdrop',
    variants: [
      {
        name: 'Interactive',
        description: 'Click to show overlay',
        code: `<Overlay open={open} onClick={handleClose} />`,
        render: () => <OverlayDemo />,
      },
    ],
  },
  scrollArea: {
    id: 'scrollArea',
    name: 'ScrollArea',
    category: 'layouts',
    description: 'Custom scrollbar component with auto-hide and theming',
    variants: [
      {
        name: 'Basic',
        description: 'Basic scroll area',
        code: `<ScrollArea maxHeight="200px">
  <div>Long content here...</div>
</ScrollArea>`,
        render: (): ReactElement => (
          <ScrollArea maxHeight="150px" style={{ border: '1px solid #ddd', padding: '8px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {Array.from({ length: 20 }, (_, i) => (
                <Text key={i}>Scrollable content line {i + 1}</Text>
              ))}
            </div>
          </ScrollArea>
        ),
      },
      {
        name: 'Thin Scrollbar',
        description: 'Scroll area with thin scrollbar',
        code: `<ScrollArea maxHeight="200px" scrollbarWidth="thin">
  <div>Content...</div>
</ScrollArea>`,
        render: (): ReactElement => (
          <ScrollArea
            maxHeight="150px"
            scrollbarWidth="thin"
            style={{ border: '1px solid #ddd', padding: '8px' }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {Array.from({ length: 15 }, (_, i) => (
                <Card key={i}>
                  <Text>Card item {i + 1}</Text>
                </Card>
              ))}
            </div>
          </ScrollArea>
        ),
      },
    ],
  },
};
