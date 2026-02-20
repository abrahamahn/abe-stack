// main/apps/storybook/src/stories/patterns/Navigation.stories.tsx
/**
 * Navigation Patterns
 *
 * Common navigation layouts using Tabs, buttons, and layout components.
 */
import { AppShell, Badge, Button, Heading, MenuItem, Tabs, Text } from '@bslt/ui';
import { useState } from 'react';

import type { Meta, StoryObj } from '@storybook/react';

const meta: Meta = {
  title: 'Patterns/Navigation',
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
  },
};
export default meta;

type Story = StoryObj;

export const TopNavigation: Story = {
  render: () => (
    <div>
      <nav
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: 'var(--ui-gap-sm) var(--ui-gap-lg)',
          borderBottom: '1px solid var(--ui-color-border)',
          backgroundColor: 'var(--ui-color-bg)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--ui-gap-lg)' }}>
          <Heading as="h1" size="sm">
            AppName
          </Heading>
          <div style={{ display: 'flex', gap: 'var(--ui-gap-sm)' }}>
            <Button variant="text" size="small">
              Dashboard
            </Button>
            <Button variant="text" size="small">
              Projects
            </Button>
            <Button variant="text" size="small">
              Media
            </Button>
            <Button variant="text" size="small">
              Settings
            </Button>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--ui-gap-sm)' }}>
          <Badge tone="info">3</Badge>
          <Button variant="secondary" size="small">
            Profile
          </Button>
        </div>
      </nav>
      <main style={{ padding: 'var(--ui-gap-xl)' }}>
        <Text tone="muted">Page content goes here.</Text>
      </main>
    </div>
  ),
};

export const SidebarNavigation: Story = {
  render: function SidebarNavigationStory() {
    const [active, setActive] = useState('dashboard');
    return (
      <div style={{ height: '500px' }}>
        <AppShell
          header={
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '0 var(--ui-gap-lg)',
                height: '100%',
                borderBottom: '1px solid var(--ui-color-border)',
              }}
            >
              <Heading as="h1" size="sm">
                AppName
              </Heading>
            </div>
          }
          sidebar={
            <nav
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 'var(--ui-gap-xs)',
                padding: 'var(--ui-gap-md)',
                borderRight: '1px solid var(--ui-color-border)',
                height: '100%',
              }}
            >
              <MenuItem
                data-active={active === 'dashboard'}
                onClick={() => {
                  setActive('dashboard');
                }}
              >
                Dashboard
              </MenuItem>
              <MenuItem
                data-active={active === 'projects'}
                onClick={() => {
                  setActive('projects');
                }}
              >
                Projects
              </MenuItem>
              <MenuItem
                data-active={active === 'media'}
                onClick={() => {
                  setActive('media');
                }}
              >
                Media Library
              </MenuItem>
              <MenuItem
                data-active={active === 'team'}
                onClick={() => {
                  setActive('team');
                }}
              >
                Team
              </MenuItem>
              <MenuItem
                data-active={active === 'settings'}
                onClick={() => {
                  setActive('settings');
                }}
              >
                Settings
              </MenuItem>
            </nav>
          }
        >
          <main style={{ padding: 'var(--ui-gap-xl)' }}>
            <Heading as="h2" size="md">
              {active.charAt(0).toUpperCase() + active.slice(1)}
            </Heading>
            <Text tone="muted" style={{ marginTop: 'var(--ui-gap-sm)' }}>
              Content for the {active} section.
            </Text>
          </main>
        </AppShell>
      </div>
    );
  },
};

export const TabbedNavigation: Story = {
  render: () => (
    <div style={{ padding: 'var(--ui-gap-xl)' }}>
      <Heading as="h1" size="lg" style={{ marginBottom: 'var(--ui-gap-md)' }}>
        Project Settings
      </Heading>
      <Tabs
        items={[
          {
            id: 'general',
            label: 'General',
            content: (
              <div style={{ padding: 'var(--ui-gap-lg)' }}>
                <Text>General project settings like name, description, and visibility.</Text>
              </div>
            ),
          },
          {
            id: 'members',
            label: 'Members',
            content: (
              <div style={{ padding: 'var(--ui-gap-lg)' }}>
                <Text>Team members and their roles in this project.</Text>
              </div>
            ),
          },
          {
            id: 'integrations',
            label: 'Integrations',
            content: (
              <div style={{ padding: 'var(--ui-gap-lg)' }}>
                <Text>Third-party integrations and webhooks.</Text>
              </div>
            ),
          },
          {
            id: 'danger',
            label: 'Danger Zone',
            content: (
              <div style={{ padding: 'var(--ui-gap-lg)' }}>
                <Text tone="danger">Destructive actions like deleting this project.</Text>
              </div>
            ),
          },
        ]}
      />
    </div>
  ),
};

export const Breadcrumbs: Story = {
  render: () => (
    <div style={{ padding: 'var(--ui-gap-xl)' }}>
      <nav
        aria-label="Breadcrumb"
        style={{ display: 'flex', alignItems: 'center', gap: 'var(--ui-gap-xs)' }}
      >
        <Button variant="text" size="small">
          Home
        </Button>
        <Text tone="muted" style={{ fontSize: 'var(--ui-font-size-sm)' }}>
          /
        </Text>
        <Button variant="text" size="small">
          Projects
        </Button>
        <Text tone="muted" style={{ fontSize: 'var(--ui-font-size-sm)' }}>
          /
        </Text>
        <Button variant="text" size="small">
          My Project
        </Button>
        <Text tone="muted" style={{ fontSize: 'var(--ui-font-size-sm)' }}>
          /
        </Text>
        <Text
          style={{ fontSize: 'var(--ui-font-size-sm)', fontWeight: 'var(--ui-font-weight-medium)' }}
        >
          Settings
        </Text>
      </nav>
      <Heading as="h1" size="lg" style={{ marginTop: 'var(--ui-gap-md)' }}>
        Project Settings
      </Heading>
    </div>
  ),
};

export const BottomNavigation: Story = {
  render: () => (
    <div
      style={{
        height: '400px',
        display: 'flex',
        flexDirection: 'column',
        border: '1px solid var(--ui-color-border)',
        borderRadius: 'var(--ui-radius-md)',
        overflow: 'hidden',
      }}
    >
      <main style={{ flex: 1, padding: 'var(--ui-gap-xl)' }}>
        <Text tone="muted">Mobile-style layout with bottom navigation.</Text>
      </main>
      <nav
        style={{
          display: 'flex',
          justifyContent: 'space-around',
          padding: 'var(--ui-gap-sm)',
          borderTop: '1px solid var(--ui-color-border)',
          backgroundColor: 'var(--ui-color-bg)',
        }}
      >
        <Button variant="text" size="small">
          Home
        </Button>
        <Button variant="text" size="small">
          Search
        </Button>
        <Button variant="text" size="small">
          Library
        </Button>
        <Button variant="text" size="small">
          Profile
        </Button>
      </nav>
    </div>
  ),
};
