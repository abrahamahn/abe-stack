// shared/ui/src/hooks/useUndoRedoShortcuts.ts
import { useCallback, useEffect, useRef } from 'react';

// ============================================================================
// Types
// ============================================================================

/**
 * Key binding configuration for undo/redo shortcuts.
 */
export interface UndoRedoKeyBindings {
  /**
   * Key bindings for undo action.
   * @default ['ctrl+z'] (Ctrl+Z on Windows/Linux, Cmd+Z on Mac)
   */
  undo?: string[];
  /**
   * Key bindings for redo action.
   * @default ['ctrl+y', 'ctrl+shift+z'] (also supports Cmd+Shift+Z on Mac)
   */
  redo?: string[];
}

/**
 * Callbacks for undo/redo actions.
 */
export interface UndoRedoCallbacks {
  /**
   * Called when undo shortcut is triggered.
   */
  onUndo: () => void;
  /**
   * Called when redo shortcut is triggered.
   */
  onRedo: () => void;
}

/**
 * Options for useUndoRedoShortcuts hook.
 */
export interface UseUndoRedoShortcutsOptions extends UndoRedoCallbacks {
  /**
   * Whether shortcuts are enabled.
   * @default true
   */
  enabled?: boolean;
  /**
   * Whether undo is available (affects whether undo shortcut triggers).
   * @default true
   */
  canUndo?: boolean;
  /**
   * Whether redo is available (affects whether redo shortcut triggers).
   * @default true
   */
  canRedo?: boolean;
  /**
   * Custom key bindings for undo/redo.
   * @default { undo: ['ctrl+z'], redo: ['ctrl+y', 'ctrl+shift+z'] }
   */
  keyBindings?: UndoRedoKeyBindings;
  /**
   * Whether to skip when user is typing in input/textarea/contenteditable.
   * @default false
   */
  skipInputs?: boolean;
  /**
   * Target element to attach the listener to.
   * @default window
   */
  target?: EventTarget | null;
}

/**
 * Result returned by useUndoRedoShortcuts hook.
 */
export interface UseUndoRedoShortcutsResult {
  /**
   * Manually trigger undo (useful for toolbar buttons).
   */
  triggerUndo: () => void;
  /**
   * Manually trigger redo (useful for toolbar buttons).
   */
  triggerRedo: () => void;
}

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_UNDO_BINDINGS = ['ctrl+z'];
const DEFAULT_REDO_BINDINGS = ['ctrl+y', 'ctrl+shift+z'];

// ============================================================================
// Helpers
// ============================================================================

/**
 * Detect if the current platform is macOS.
 */
function isMac(): boolean {
  if (typeof navigator === 'undefined') return false;
  // Use userAgent as platform is deprecated
  return /Mac|iPod|iPhone|iPad/.test(navigator.userAgent);
}

/**
 * Check if the target is an input element.
 */
function isInputElement(target: EventTarget | null): boolean {
  if (target === null || !(target instanceof HTMLElement)) return false;
  return (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target.isContentEditable
  );
}

/**
 * Parse a key binding string into its components.
 */
interface ParsedBinding {
  key: string;
  ctrl: boolean;
  shift: boolean;
  alt: boolean;
  meta: boolean;
}

function parseBinding(binding: string): ParsedBinding {
  const parts = binding.toLowerCase().split('+');
  const result: ParsedBinding = {
    key: '',
    ctrl: false,
    shift: false,
    alt: false,
    meta: false,
  };

  for (const part of parts) {
    const trimmed = part.trim();
    switch (trimmed) {
      case 'ctrl':
      case 'control':
        result.ctrl = true;
        break;
      case 'shift':
        result.shift = true;
        break;
      case 'alt':
      case 'option':
        result.alt = true;
        break;
      case 'meta':
      case 'cmd':
      case 'command':
        result.meta = true;
        break;
      default:
        result.key = trimmed;
    }
  }

  return result;
}

/**
 * Check if a keyboard event matches a parsed binding.
 */
function matchesBinding(event: KeyboardEvent, binding: ParsedBinding): boolean {
  // Check key match (case-insensitive)
  if (event.key.toLowerCase() !== binding.key) {
    return false;
  }

  // On Mac, treat Cmd as Ctrl for standard shortcuts
  const macOS = isMac();

  // Check ctrl (or meta on Mac)
  if (binding.ctrl) {
    if (macOS) {
      // On Mac, Ctrl+Z means Cmd+Z
      if (!event.metaKey && !event.ctrlKey) return false;
    } else {
      if (!event.ctrlKey) return false;
    }
  } else {
    // If ctrl is not expected, neither should be pressed
    if (macOS) {
      // On Mac, don't trigger if Cmd is pressed when not expected
      if (event.metaKey) return false;
    } else {
      if (event.ctrlKey) return false;
    }
  }

  // Check shift
  if (binding.shift !== event.shiftKey) {
    return false;
  }

  // Check alt
  if (binding.alt !== event.altKey) {
    return false;
  }

  // Check meta (when explicitly specified, not for ctrl->cmd mapping)
  if (binding.meta && !event.metaKey) {
    return false;
  }

  return true;
}

/**
 * Check if an event matches any of the given bindings.
 */
function matchesAnyBinding(event: KeyboardEvent, bindings: string[]): boolean {
  for (const binding of bindings) {
    const parsed = parseBinding(binding);
    if (matchesBinding(event, parsed)) {
      return true;
    }
  }
  return false;
}

// ============================================================================
// Hook
// ============================================================================

/**
 * Hook for handling undo/redo keyboard shortcuts.
 *
 * This hook provides a convenient way to integrate keyboard shortcuts with
 * an undo/redo system. It handles:
 * - Ctrl+Z (undo) and Ctrl+Y / Ctrl+Shift+Z (redo)
 * - Mac Command key variants (Cmd+Z, Cmd+Shift+Z)
 * - Preventing default browser behavior
 * - Conditional enabling/disabling
 * - Custom key bindings
 *
 * @example
 * // Basic usage with UndoRedoStack
 * const undoStack = useRef(new UndoRedoStack<MyOperation>({...}));
 * const [state, setState] = useState(() => undoStack.current.getState());
 *
 * const { triggerUndo, triggerRedo } = useUndoRedoShortcuts({
 *   onUndo: () => undoStack.current.undo(),
 *   onRedo: () => undoStack.current.redo(),
 *   canUndo: state.canUndo,
 *   canRedo: state.canRedo,
 * });
 *
 * @example
 * // Conditionally enabled based on focus
 * useUndoRedoShortcuts({
 *   onUndo: handleUndo,
 *   onRedo: handleRedo,
 *   enabled: isEditorFocused,
 * });
 *
 * @example
 * // With custom key bindings
 * useUndoRedoShortcuts({
 *   onUndo: handleUndo,
 *   onRedo: handleRedo,
 *   keyBindings: {
 *     undo: ['ctrl+z', 'alt+backspace'],
 *     redo: ['ctrl+y', 'ctrl+shift+z', 'alt+shift+backspace'],
 *   },
 * });
 */
export function useUndoRedoShortcuts(
  options: UseUndoRedoShortcutsOptions,
): UseUndoRedoShortcutsResult {
  const {
    onUndo,
    onRedo,
    enabled = true,
    canUndo = true,
    canRedo = true,
    keyBindings = {},
    skipInputs = false,
    target,
  } = options;

  // Get key bindings with defaults
  const undoBindings = keyBindings.undo ?? DEFAULT_UNDO_BINDINGS;
  const redoBindings = keyBindings.redo ?? DEFAULT_REDO_BINDINGS;

  // Store callbacks in refs to avoid recreating listener
  const onUndoRef = useRef(onUndo);
  const onRedoRef = useRef(onRedo);
  onUndoRef.current = onUndo;
  onRedoRef.current = onRedo;

  // Store state in refs for the event handler
  const canUndoRef = useRef(canUndo);
  const canRedoRef = useRef(canRedo);
  canUndoRef.current = canUndo;
  canRedoRef.current = canRedo;

  // Manual trigger functions for toolbar buttons
  const triggerUndo = useCallback((): void => {
    if (canUndoRef.current) {
      onUndoRef.current();
    }
  }, []);

  const triggerRedo = useCallback((): void => {
    if (canRedoRef.current) {
      onRedoRef.current();
    }
  }, []);

  // Event handler
  const handleKeyDown = useCallback(
    (event: Event): void => {
      if (!enabled) return;
      if (!(event instanceof KeyboardEvent)) return;

      // Skip if user is typing in input/textarea
      if (skipInputs && isInputElement(event.target)) {
        return;
      }

      // Check for redo first (because Ctrl+Shift+Z should not match Ctrl+Z)
      if (matchesAnyBinding(event, redoBindings)) {
        event.preventDefault();
        if (canRedoRef.current) {
          onRedoRef.current();
        }
        return;
      }

      // Check for undo
      if (matchesAnyBinding(event, undoBindings)) {
        event.preventDefault();
        if (canUndoRef.current) {
          onUndoRef.current();
        }
        return;
      }
    },
    [enabled, skipInputs, undoBindings, redoBindings],
  );

  // Set up event listener
  useEffect(() => {
    if (!enabled) return;

    const targetElement = target ?? (typeof window !== 'undefined' ? window : null);
    if (targetElement === null) return;

    targetElement.addEventListener('keydown', handleKeyDown);

    return (): void => {
      targetElement.removeEventListener('keydown', handleKeyDown);
    };
  }, [target, handleKeyDown, enabled]);

  return {
    triggerUndo,
    triggerRedo,
  };
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Get the display text for the undo shortcut based on platform.
 *
 * @example
 * getUndoShortcutText() // 'Ctrl+Z' on Windows/Linux, 'Cmd+Z' on Mac
 */
export function getUndoShortcutText(): string {
  return isMac() ? 'Cmd+Z' : 'Ctrl+Z';
}

/**
 * Get the display text for the redo shortcut based on platform.
 *
 * @example
 * getRedoShortcutText() // 'Ctrl+Y' on Windows/Linux, 'Cmd+Shift+Z' on Mac
 */
export function getRedoShortcutText(): string {
  return isMac() ? 'Cmd+Shift+Z' : 'Ctrl+Y';
}

/**
 * Get both shortcut display texts as an object.
 */
export function getUndoRedoShortcutTexts(): { undo: string; redo: string } {
  return {
    undo: getUndoShortcutText(),
    redo: getRedoShortcutText(),
  };
}
