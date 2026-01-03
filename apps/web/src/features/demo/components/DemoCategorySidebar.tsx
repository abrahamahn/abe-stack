import { Button } from '@abe-stack/ui';

import type { DemoPaneConfig } from '../types';

interface LayoutToggle {
  key: keyof DemoPaneConfig;
  label: string;
  icon: string;
}

const LAYOUT_TOGGLES: LayoutToggle[] = [
  { key: 'top', label: 'Top bar', icon: 'T' },
  { key: 'left', label: 'Left panel', icon: 'L' },
  { key: 'right', label: 'Right panel', icon: 'R' },
  { key: 'bottom', label: 'Bottom bar', icon: 'B' },
];

interface DemoCategorySidebarProps {
  categories: string[];
  activeCategory: string;
  paneConfig: DemoPaneConfig;
  isMobile: boolean;
  layoutBorder: string;
  onCategoryChange: (category: string) => void;
  onTogglePane: (pane: keyof DemoPaneConfig) => void;
  onResetLayout: () => void;
}

export function DemoCategorySidebar({
  categories,
  activeCategory,
  paneConfig,
  isMobile,
  layoutBorder,
  onCategoryChange,
  onTogglePane,
  onResetLayout,
}: DemoCategorySidebarProps): React.ReactElement {
  return (
    <div
      style={{
        width: isMobile ? '42px' : '50px',
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
        padding: isMobile ? '4px' : '8px',
        flexShrink: 0,
        borderRight: layoutBorder,
        background: 'var(--ui-color-bg)',
      }}
    >
      {categories.map((cat) => (
        <Button
          key={cat}
          variant={activeCategory === cat ? 'primary' : 'secondary'}
          onClick={() => {
            onCategoryChange(cat);
          }}
          title={cat.charAt(0).toUpperCase() + cat.slice(1)}
          style={{ width: '100%', height: '40px', padding: 0 }}
        >
          {cat.charAt(0).toUpperCase()}
        </Button>
      ))}
      <div
        style={{
          marginTop: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '4px',
          paddingTop: '8px',
        }}
      >
        {LAYOUT_TOGGLES.map((toggle) => (
          <Button
            key={toggle.key}
            variant={paneConfig[toggle.key].visible ? 'primary' : 'secondary'}
            onClick={() => {
              onTogglePane(toggle.key);
            }}
            title={`Toggle ${toggle.label}`}
            aria-label={`Toggle ${toggle.label}`}
            style={{ width: '100%', height: '36px', padding: 0 }}
          >
            {toggle.icon}
          </Button>
        ))}
        <Button
          variant="secondary"
          onClick={onResetLayout}
          title="Reset layout"
          aria-label="Reset layout"
          style={{ width: '100%', height: '36px', padding: 0, marginTop: '4px' }}
        >
          ↺
        </Button>
      </div>
    </div>
  );
}
