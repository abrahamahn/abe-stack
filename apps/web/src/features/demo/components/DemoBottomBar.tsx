import { Button, Text } from '@abe-stack/ui';

import { KEYBOARD_SHORTCUTS } from '../hooks';

// Version from package - in a real app, inject via build process
const UI_VERSION = '1.1.0';
const ENV = import.meta.env.MODE;

interface DemoBottomBarProps {
  totalComponents: number;
  isMobile: boolean;
  themeLabel: string;
  themeIcon: string;
  onCycleTheme: () => void;
}

export function DemoBottomBar({
  totalComponents,
  isMobile,
  themeLabel,
  themeIcon,
  onCycleTheme,
}: DemoBottomBarProps): React.ReactElement {
  return (
    <div
      style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: isMobile ? '8px 12px' : '8px 16px',
        gap: '12px',
        background: 'var(--ui-color-bg)',
        fontSize: '12px',
      }}
    >
      {/* Left: Version & Environment */}
      <div className="d-flex items-center gap-4">
        <Text tone="muted" style={{ fontSize: '12px' }}>
          <strong>v{UI_VERSION}</strong>
        </Text>
        <Text
          tone="muted"
          style={{
            fontSize: '10px',
            padding: '2px 6px',
            borderRadius: '4px',
            background:
              ENV === 'development' ? 'var(--ui-color-warning)' : 'var(--ui-color-success)',
            color: 'var(--ui-color-text-inverse)',
            textTransform: 'uppercase',
            fontWeight: 600,
          }}
        >
          {ENV === 'development' ? 'DEV' : 'PROD'}
        </Text>
        {!isMobile && (
          <Text tone="muted" style={{ fontSize: '12px' }}>
            {totalComponents} components
          </Text>
        )}
      </div>

      {/* Center: Keyboard Shortcuts (desktop only) */}
      {!isMobile && (
        <div className="d-flex items-center gap-5">
          {KEYBOARD_SHORTCUTS.map((shortcut) => (
            <Text key={shortcut.key} tone="muted" style={{ fontSize: '11px' }}>
              <kbd
                style={{
                  padding: '2px 5px',
                  borderRadius: '3px',
                  border: '1px solid var(--ui-color-border)',
                  background: 'var(--ui-color-surface)',
                  fontFamily: 'monospace',
                  fontSize: '10px',
                }}
              >
                {shortcut.key}
              </kbd>{' '}
              {shortcut.description}
            </Text>
          ))}
        </div>
      )}

      {/* Right: Theme Toggle */}
      <Button
        variant="secondary"
        size="small"
        onClick={onCycleTheme}
        title={`Theme: ${themeLabel} (click to change)`}
        aria-label={`Theme: ${themeLabel}, click to change`}
        style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 8px' }}
      >
        <span>{themeIcon}</span>
        {!isMobile && <span style={{ fontSize: '12px' }}>{themeLabel}</span>}
      </Button>
    </div>
  );
}
