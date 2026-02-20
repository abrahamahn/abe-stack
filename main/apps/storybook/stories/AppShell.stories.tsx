// main/apps/storybook/stories/AppShell.stories.tsx
import { AppShell, type AppShellProps, MenuItem, Text } from '@bslt/ui';
import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';

const meta: Meta<typeof AppShell> = {
  title: 'Layouts/AppShell',
  component: AppShell,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
  },
  argTypes: {
    headerHeight: { control: 'text' },
    footerHeight: { control: 'text' },
    sidebarWidth: { control: 'text' },
    asideWidth: { control: 'text' },
    sidebarCollapsed: { control: 'boolean' },
    asideCollapsed: { control: 'boolean' },
    headerCollapsed: { control: 'boolean' },
    footerCollapsed: { control: 'boolean' },
    sidebarResizable: { control: 'boolean' },
    asideResizable: { control: 'boolean' },
  },
};
export default meta;

type Story = StoryObj<typeof AppShell>;

/** Placeholder for layout regions. */
function RegionPlaceholder({
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
        minHeight: '2rem',
        backgroundColor: bg,
        borderRadius: 'var(--ui-radius-sm)',
        padding: 'var(--ui-gap-sm)',
      }}
    >
      <Text tone="muted" style={{ fontSize: 'var(--ui-font-size-sm)' }}>
        {label}
      </Text>
    </div>
  );
}

export const Default: Story = {
  render: () => (
    <div style={{ height: '500px' }}>
      <AppShell
        header={<RegionPlaceholder label="Header" />}
        sidebar={<RegionPlaceholder label="Sidebar" />}
        footer={<RegionPlaceholder label="Footer" />}
      >
        <RegionPlaceholder label="Main Content" bg="var(--ui-color-bg)" />
      </AppShell>
    </div>
  ),
};

export const WithAllRegions: Story = {
  render: () => (
    <div style={{ height: '500px' }}>
      <AppShell
        header={<RegionPlaceholder label="Header / Top Bar" />}
        sidebar={<RegionPlaceholder label="Left Sidebar" />}
        aside={<RegionPlaceholder label="Right Aside" />}
        footer={<RegionPlaceholder label="Footer / Bottom Bar" />}
      >
        <RegionPlaceholder label="Main Content Area" bg="var(--ui-color-bg)" />
      </AppShell>
    </div>
  ),
};

export const WithSidebarNavigation: Story = {
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
              <Text style={{ fontWeight: 'var(--ui-font-weight-semibold)' }}>My App</Text>
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
              {['Dashboard', 'Projects', 'Media', 'Team', 'Settings'].map((item) => {
                const key = item.toLowerCase();
                return (
                  <MenuItem
                    key={key}
                    data-active={active === key}
                    onClick={() => { setActive(key); }}
                  >
                    {item}
                  </MenuItem>
                );
              })}
            </nav>
          }
        >
          <main style={{ padding: 'var(--ui-gap-xl)' }}>
            <Text>Content for the {active} section.</Text>
          </main>
        </AppShell>
      </div>
    );
  },
};

export const SidebarCollapsed: Story = {
  render: () => (
    <div style={{ height: '500px' }}>
      <AppShell
        header={<RegionPlaceholder label="Header" />}
        sidebar={<RegionPlaceholder label="Sidebar (collapsed)" />}
        sidebarCollapsed
        footer={<RegionPlaceholder label="Footer" />}
      >
        <RegionPlaceholder label="Main Content (sidebar collapsed)" bg="var(--ui-color-bg)" />
      </AppShell>
    </div>
  ),
};

export const ResizableSidebar: Story = {
  render: () => (
    <div style={{ height: '500px' }}>
      <AppShell
        header={<RegionPlaceholder label="Header" />}
        sidebar={<RegionPlaceholder label="Resizable Sidebar (drag the separator)" />}
        sidebarResizable
        sidebarMinSize={10}
        sidebarMaxSize={40}
        footer={<RegionPlaceholder label="Footer" />}
      >
        <RegionPlaceholder label="Main Content" bg="var(--ui-color-bg)" />
      </AppShell>
    </div>
  ),
};

export const CustomSizes: Story = {
  args: {
    headerHeight: '3rem',
    footerHeight: '2.5rem',
    sidebarWidth: '12rem',
  },
  render: (args: AppShellProps) => (
    <div style={{ height: '500px' }}>
      <AppShell
        {...args}
        header={<RegionPlaceholder label={`Header (${String(args.headerHeight)})`} />}
        sidebar={<RegionPlaceholder label={`Sidebar (${String(args.sidebarWidth)})`} />}
        footer={<RegionPlaceholder label={`Footer (${String(args.footerHeight)})`} />}
      >
        <RegionPlaceholder label="Main Content" bg="var(--ui-color-bg)" />
      </AppShell>
    </div>
  ),
};
