// main/apps/web/src/features/command-palette/components/CommandPalette.tsx
/**
 * Command Palette Component
 *
 * A Ctrl+K / Cmd+K overlay for searching and executing commands.
 * Uses the Dialog compound component for accessible modal behavior
 * and provides keyboard navigation (arrow keys + Enter).
 */

import { Dialog, Input, Kbd, Text } from '@bslt/ui';
import {
  ReactElement,
  KeyboardEvent as ReactKeyboardEvent,
  useCallback,
  useEffect,
  useRef,
  type ChangeEvent,
} from 'react';

import { useCommandPalette } from '../hooks';

import type { Command } from '../data';

// ============================================================================
// Sub-components
// ============================================================================

interface CommandItemProps {
  command: Command;
  isSelected: boolean;
  onSelect: () => void;
  onHover: () => void;
}

function CommandItem({ command, isSelected, onSelect, onHover }: CommandItemProps): ReactElement {
  const itemRef = useRef<HTMLDivElement>(null);

  // Scroll selected item into view when navigating with keyboard
  useEffect(() => {
    if (
      isSelected &&
      itemRef.current !== null &&
      typeof itemRef.current.scrollIntoView === 'function'
    ) {
      itemRef.current.scrollIntoView({ block: 'nearest' });
    }
  }, [isSelected]);

  return (
    <div
      ref={itemRef}
      role="option"
      aria-selected={isSelected}
      className="command-palette-item"
      style={{
        padding: 'var(--ui-gap-sm) var(--ui-gap-md)',
        cursor: 'pointer',
        borderRadius: 'var(--ui-radius-sm)',
        backgroundColor: isSelected ? 'var(--ui-color-surface-strong)' : 'transparent',
        transition: `background-color var(--ui-motion-duration-fast)`,
      }}
      onClick={onSelect}
      onMouseEnter={onHover}
    >
      <Text size="sm" style={{ fontWeight: 'var(--ui-font-weight-medium)' }}>
        {command.label}
      </Text>
      <Text size="xs" tone="muted">
        {command.description}
      </Text>
    </div>
  );
}

// ============================================================================
// Category Header
// ============================================================================

function CategoryHeader({ label }: { label: string }): ReactElement {
  return (
    <Text
      size="xs"
      tone="muted"
      style={{
        padding: 'var(--ui-gap-xs) var(--ui-gap-md)',
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        fontWeight: 'var(--ui-font-weight-semibold)',
      }}
    >
      {label}
    </Text>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function CommandPalette(): ReactElement {
  const {
    isOpen,
    close,
    query,
    setQuery,
    filteredCommands,
    selectedIndex,
    setSelectedIndex,
    moveUp,
    moveDown,
    executeSelected,
    executeCommand,
  } = useCommandPalette();

  const inputRef = useRef<HTMLInputElement>(null);

  // Focus the search input when the palette opens
  useEffect((): (() => void) | undefined => {
    if (isOpen) {
      // Small delay to ensure the DOM is ready after portal render
      const timer = setTimeout((): void => {
        inputRef.current?.focus();
      }, 0);
      return (): void => {
        clearTimeout(timer);
      };
    }
    return undefined;
  }, [isOpen]);

  // Handle keyboard navigation within the input
  const handleKeyDown = useCallback(
    (e: ReactKeyboardEvent<HTMLInputElement>): void => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        moveDown();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        moveUp();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        executeSelected();
      }
    },
    [moveDown, moveUp, executeSelected],
  );

  // Group commands by category for display
  const navigationCommands = filteredCommands.filter((c) => c.category === 'navigation');
  const actionCommands = filteredCommands.filter((c) => c.category === 'action');

  // Build flat indexed list for tracking selection across categories
  const flatList: { command: Command; globalIndex: number }[] = [];
  let currentIndex = 0;
  for (const cmd of navigationCommands) {
    flatList.push({ command: cmd, globalIndex: currentIndex });
    currentIndex++;
  }
  for (const cmd of actionCommands) {
    flatList.push({ command: cmd, globalIndex: currentIndex });
    currentIndex++;
  }

  return (
    <Dialog.Root
      open={isOpen}
      onChange={(open: boolean): void => {
        if (!open) close();
      }}
    >
      <Dialog.Content
        title="Command Palette"
        className="command-palette-content"
        style={{
          maxWidth: '32rem',
          width: '100%',
          maxHeight: '70vh',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div style={{ padding: 'var(--ui-gap-md)' }}>
          <Input
            ref={inputRef}
            type="text"
            placeholder="Type a command..."
            value={query}
            onChange={(e: ChangeEvent<HTMLInputElement>) => {
              setQuery(e.target.value);
            }}
            onKeyDown={handleKeyDown}
            aria-label="Search commands"
            aria-activedescendant={
              filteredCommands[selectedIndex] !== undefined
                ? `command-${filteredCommands[selectedIndex].id}`
                : undefined
            }
            role="combobox"
            aria-expanded={true}
            aria-controls="command-palette-listbox"
            aria-autocomplete="list"
          />
        </div>

        <div
          id="command-palette-listbox"
          role="listbox"
          aria-label="Commands"
          style={{
            overflowY: 'auto',
            padding: 'var(--ui-gap-xs) var(--ui-gap-sm)',
            flex: 1,
          }}
        >
          {filteredCommands.length === 0 ? (
            <div style={{ padding: 'var(--ui-gap-lg)', textAlign: 'center' }}>
              <Text tone="muted" size="sm">
                No commands found
              </Text>
            </div>
          ) : (
            <>
              {navigationCommands.length > 0 && (
                <div>
                  <CategoryHeader label="Navigation" />
                  {navigationCommands.map((command) => {
                    const entry = flatList.find((f) => f.command.id === command.id);
                    const globalIdx = entry?.globalIndex ?? 0;
                    return (
                      <div key={command.id} id={`command-${command.id}`}>
                        <CommandItem
                          command={command}
                          isSelected={selectedIndex === globalIdx}
                          onSelect={() => {
                            executeCommand(globalIdx);
                          }}
                          onHover={() => {
                            setSelectedIndex(globalIdx);
                          }}
                        />
                      </div>
                    );
                  })}
                </div>
              )}

              {actionCommands.length > 0 && (
                <div>
                  <CategoryHeader label="Actions" />
                  {actionCommands.map((command) => {
                    const entry = flatList.find((f) => f.command.id === command.id);
                    const globalIdx = entry?.globalIndex ?? 0;
                    return (
                      <div key={command.id} id={`command-${command.id}`}>
                        <CommandItem
                          command={command}
                          isSelected={selectedIndex === globalIdx}
                          onSelect={() => {
                            executeCommand(globalIdx);
                          }}
                          onHover={() => {
                            setSelectedIndex(globalIdx);
                          }}
                        />
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>

        <div
          style={{
            padding: 'var(--ui-gap-sm) var(--ui-gap-md)',
            borderTop: '1px solid var(--ui-color-border)',
            display: 'flex',
            gap: 'var(--ui-gap-md)',
            justifyContent: 'center',
          }}
        >
          <Text size="xs" tone="muted">
            <Kbd>↑↓</Kbd> navigate
          </Text>
          <Text size="xs" tone="muted">
            <Kbd>Enter</Kbd> select
          </Text>
          <Text size="xs" tone="muted">
            <Kbd>Esc</Kbd> close
          </Text>
        </div>
      </Dialog.Content>
    </Dialog.Root>
  );
}
