// apps/web/src/features/demo/catalog/layoutCatalog.tsx
import {
  AppShell,
  AuthLayout,
  BottombarLayout,
  Button,
  Card,
  Checkbox,
  Container,
  Heading,
  Input,
  LeftSidebarLayout,
  PageContainer,
  RightSidebarLayout,
  StackedLayout,
  Text,
  TopbarLayout,
} from '@abe-stack/ui';

import type { ComponentDemo } from '../types';
import type { ReactElement } from 'react';

export const layoutCatalog: Record<string, ComponentDemo> = {
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
      {
        name: 'Comparison',
        description: 'Side-by-side comparison of all sizes',
        code: `<>
  <Container size="sm">Small (640px)</Container>
  <Container size="md">Medium (960px)</Container>
  <Container size="lg">Large (1200px)</Container>
</>`,
        render: (): ReactElement => (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <Container size="sm">
              <div
                style={{
                  backgroundColor: '#e3f2fd',
                  padding: '16px',
                  border: '2px solid #2196f3',
                }}
              >
                <Text>Small (640px)</Text>
              </div>
            </Container>
            <Container size="md">
              <div
                style={{
                  backgroundColor: '#f3e5f5',
                  padding: '16px',
                  border: '2px solid #9c27b0',
                }}
              >
                <Text>Medium (960px)</Text>
              </div>
            </Container>
            <Container size="lg">
              <div
                style={{
                  backgroundColor: '#fff3e0',
                  padding: '16px',
                  border: '2px solid #ff9800',
                }}
              >
                <Text>Large (1200px)</Text>
              </div>
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
          <div style={{ minHeight: '350px', backgroundColor: 'var(--color-surface)' }}>
            <AuthLayout title="Welcome Back" description="Sign in to your account to continue">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
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
          <div style={{ minHeight: '380px', backgroundColor: 'var(--color-surface)' }}>
            <AuthLayout title="Create Account" description="Sign up to get started">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <Input placeholder="Full Name" />
                <Input placeholder="Email" type="email" />
                <Input placeholder="Password" type="password" />
                <Checkbox label="I agree to the terms and conditions" />
                <Button variant="primary">Create Account</Button>
              </div>
            </AuthLayout>
          </div>
        ),
      },
      {
        name: 'Minimal',
        description: 'Authentication layout without title or description',
        code: `<AuthLayout>
  <Heading as="h2" size="md">Reset Password</Heading>
  <Text>Enter your email to receive reset instructions</Text>
  <Input placeholder="Email" />
  <Button variant="primary">Send Reset Link</Button>
</AuthLayout>`,
        render: (): ReactElement => (
          <div style={{ minHeight: '300px', backgroundColor: 'var(--color-surface)' }}>
            <AuthLayout>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <Heading as="h3" size="sm">
                  Reset Password
                </Heading>
                <Text tone="muted" className="text-sm">
                  Enter your email to receive reset instructions
                </Text>
                <Input placeholder="Email" type="email" />
                <Button variant="primary">Send Reset Link</Button>
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
  sidebarLayout: {
    id: 'sidebarLayout',
    name: 'AppShell with Sidebar',
    category: 'layouts',
    description: 'Two-column layout using AppShell with LeftSidebarLayout',
    variants: [
      {
        name: 'Basic',
        description: 'AppShell with left sidebar navigation',
        code: `<AppShell
  sidebar={
    <LeftSidebarLayout width="200px">
      <nav>Navigation items</nav>
    </LeftSidebarLayout>
  }
>
  <Heading as="h1">Main Content</Heading>
  <Text>Your page content goes here</Text>
</AppShell>`,
        render: (): ReactElement => (
          <div style={{ border: '1px solid #ddd', height: '300px', overflow: 'hidden' }}>
            <AppShell
              sidebar={
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
              }
              sidebarWidth="180px"
              style={{ height: '100%' }}
            >
              <div style={{ padding: '16px' }}>
                <Heading as="h2" size="md">
                  Main Content Area
                </Heading>
                <Text>This is the main content area with a fixed-width sidebar on the left.</Text>
                <Card style={{ marginTop: '16px' }}>
                  <Text>Content cards and other components work well in the main area.</Text>
                </Card>
              </div>
            </AppShell>
          </div>
        ),
      },
      {
        name: 'With Header',
        description: 'AppShell with sidebar and header',
        code: `<AppShell
  header={<TopbarLayout>Header</TopbarLayout>}
  sidebar={<LeftSidebarLayout>Nav</LeftSidebarLayout>}
>
  <Text>Main content</Text>
</AppShell>`,
        render: (): ReactElement => (
          <div style={{ border: '1px solid #ddd', height: '300px', overflow: 'hidden' }}>
            <AppShell
              header={
                <div style={{ padding: '12px 16px', borderBottom: '1px solid #ddd' }}>
                  <Heading as="h3" size="sm">
                    Dashboard
                  </Heading>
                </div>
              }
              sidebar={
                <LeftSidebarLayout width="150px" bordered>
                  <div style={{ padding: '8px' }}>
                    <nav style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <Button variant="text" size="small" style={{ justifyContent: 'flex-start' }}>
                        Home
                      </Button>
                      <Button variant="text" size="small" style={{ justifyContent: 'flex-start' }}>
                        About
                      </Button>
                    </nav>
                  </div>
                </LeftSidebarLayout>
              }
              sidebarWidth="150px"
              headerHeight="50px"
              style={{ height: '100%' }}
            >
              <div style={{ padding: '16px' }}>
                <Text>Main content area with header bar above.</Text>
                <Card style={{ marginTop: '16px' }}>
                  <Text>The header appears above the main content.</Text>
                </Card>
              </div>
            </AppShell>
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
              <Card style={{ marginTop: '16px' }}>
                <Text>Regular content follows the hero section.</Text>
              </Card>
            </StackedLayout>
          </div>
        ),
      },
    ],
  },
  topbarLayout: {
    id: 'topbarLayout',
    name: 'TopbarLayout',
    category: 'layouts',
    description: 'Fixed top navigation bar layout',
    variants: [
      {
        name: 'Basic',
        description: 'Basic topbar with navigation',
        code: `<TopbarLayout>
  <Heading as="h3">App Name</Heading>
  <nav>Navigation</nav>
</TopbarLayout>`,
        render: (): ReactElement => (
          <div style={{ border: '1px solid var(--ui-color-border)' }}>
            <TopbarLayout>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  width: '100%',
                }}
              >
                <Heading as="h4" size="sm" style={{ margin: 0 }}>
                  App Name
                </Heading>
                <nav style={{ display: 'flex', gap: '8px' }}>
                  <Button variant="text" size="small">
                    Home
                  </Button>
                  <Button variant="text" size="small">
                    About
                  </Button>
                  <Button variant="text" size="small">
                    Contact
                  </Button>
                </nav>
              </div>
            </TopbarLayout>
          </div>
        ),
      },
    ],
  },
  bottombarLayout: {
    id: 'bottombarLayout',
    name: 'BottombarLayout',
    category: 'layouts',
    description: 'Fixed bottom navigation bar layout (mobile-style)',
    variants: [
      {
        name: 'Basic',
        description: 'Basic bottom navigation bar',
        code: `<BottombarLayout>
  <Button>Home</Button>
  <Button>Search</Button>
  <Button>Profile</Button>
</BottombarLayout>`,
        render: (): ReactElement => (
          <div
            style={{
              border: '1px solid var(--ui-color-border)',
              position: 'relative',
              height: '200px',
            }}
          >
            <div style={{ padding: '16px' }}>
              <Text>Content area above bottom bar</Text>
            </div>
            <BottombarLayout>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-around',
                  width: '100%',
                }}
              >
                <Button variant="text" size="small">
                  Home
                </Button>
                <Button variant="text" size="small">
                  Search
                </Button>
                <Button variant="text" size="small">
                  Profile
                </Button>
              </div>
            </BottombarLayout>
          </div>
        ),
      },
    ],
  },
  rightSidebarLayout: {
    id: 'rightSidebarLayout',
    name: 'RightSidebarLayout',
    category: 'layouts',
    description: 'Layout with a right sidebar panel',
    variants: [
      {
        name: 'Basic',
        description: 'Right sidebar with content',
        code: `<RightSidebarLayout width="200px">
  <Text>Sidebar content</Text>
</RightSidebarLayout>`,
        render: (): ReactElement => (
          <div
            style={{
              border: '1px solid var(--ui-color-border)',
              height: '200px',
              display: 'flex',
            }}
          >
            <div style={{ flex: 1, padding: '16px' }}>
              <Text>Main content area</Text>
            </div>
            <RightSidebarLayout width="180px" bordered>
              <div style={{ padding: '8px' }}>
                <Heading as="h4" size="sm" style={{ marginBottom: '12px' }}>
                  Details
                </Heading>
                <Text tone="muted">Sidebar info here</Text>
              </div>
            </RightSidebarLayout>
          </div>
        ),
      },
    ],
  },
};
