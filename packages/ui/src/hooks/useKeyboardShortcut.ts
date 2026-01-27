// packages/ui/src/hooks/useKeyboardShortcut.ts
import { useCallback, useEffect, useRef } from 'react';

// ============================================================================
// Types
// ============================================================================

/**
 * Modifier keys that can be used in keyboard shortcuts.
 */
export interface KeyModifiers {
  /** Whether Ctrl (or Cmd on Mac) is required */
  ctrl?: boolean;
  /** Whether Alt (or Option on Mac) is required */
  alt?: boolean;
  /** Whether Shift is required */
  shift?: boolean;
  /** Whether Meta (Cmd on Mac, Win on Windows) is required */
  meta?: boolean;
}

/**
 * Options for the useKeyboardShortcut hook.
 */
export interface KeyboardShortcutOptions extends KeyModifiers {
  /**
   * The key to listen for (case-insensitive).
   * Examples: 'z', 'y', 'Escape', 'Enter', 'ArrowUp'
   */
  key: string;
  /**
   * Handler function called when the shortcut is triggered.
   */
  handler: (event: KeyboardEvent) => void;
  /**
   * Whether shortcuts are enabled.
   * @default true
   */
  enabled?: boolean;
  /**
   * Whether to prevent default browser behavior.
   * @default true
   */
  preventDefault?: boolean;
  /**
   * Whether to stop propagation of the event.
   * @default false
   */
  stopPropagation?: boolean;
  /**
   * Whether to skip when user is typing in input/textarea/contenteditable.
   * @default false (different from useKeyboardShortcuts which defaults to true)
   */
  skipInputs?: boolean;
  /**
   * Target element to attach the listener to.
   * @default window
   */
  target?: EventTarget | null;
  /**
   * Event type to listen for.
   * @default 'keydown'
   */
  eventType?: 'keydown' | 'keyup';
}

/**
 * Parsed key binding representation.
 */
export interface ParsedKeyBinding {
  key: string;
  ctrl: boolean;
  alt: boolean;
  shift: boolean;
  meta: boolean;
}

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
  if (!(target instanceof HTMLElement)) return false;
  return (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target.isContentEditable
  );
}

/**
 * Normalize a key string for comparison.
 */
function normalizeKey(key: string): string {
  return key.toLowerCase();
}

/**
 * Check if the event matches the required modifiers.
 */
function matchesModifiers(
  event: KeyboardEvent,
  modifiers: KeyModifiers,
  treatCtrlAsMeta: boolean,
): boolean {
  const { ctrl = false, alt = false, shift = false, meta = false } = modifiers;

  // On Mac, Cmd+key is typically used instead of Ctrl+key
  // Allow ctrl option to match either ctrlKey or metaKey on Mac
  const ctrlMatches = treatCtrlAsMeta
    ? ctrl
      ? event.ctrlKey || event.metaKey
      : !event.ctrlKey && !event.metaKey
    : ctrl
      ? event.ctrlKey
      : !event.ctrlKey;

  const altMatches = alt ? event.altKey : !event.altKey;
  const shiftMatches = shift ? event.shiftKey : !event.shiftKey;
  const metaMatches = treatCtrlAsMeta
    ? true // Already handled in ctrlMatches
    : meta
      ? event.metaKey
      : !event.metaKey;

  return ctrlMatches && altMatches && shiftMatches && metaMatches;
}

/**
 * Parse a key binding string like "ctrl+shift+z" into components.
 *
 * @example
 * parseKeyBinding('ctrl+z') // { key: 'z', ctrl: true, alt: false, shift: false, meta: false }
 * parseKeyBinding('ctrl+shift+z') // { key: 'z', ctrl: true, alt: false, shift: true, meta: false }
 */
export function parseKeyBinding(binding: string): ParsedKeyBinding {
  const parts = binding.toLowerCase().split('+');
  const result: ParsedKeyBinding = {
    key: '',
    ctrl: false,
    alt: false,
    shift: false,
    meta: false,
  };

  for (const part of parts) {
    const trimmed = part.trim();
    switch (trimmed) {
      case 'ctrl':
      case 'control':
        result.ctrl = true;
        break;
      case 'alt':
      case 'option':
        result.alt = true;
        break;
      case 'shift':
        result.shift = true;
        break;
      case 'meta':
      case 'cmd':
      case 'command':
      case 'win':
      case 'windows':
        result.meta = true;
        break;
      default:
        result.key = trimmed;
    }
  }

  return result;
}

/**
 * Format a key binding for display.
 *
 * @example
 * formatKeyBinding({ key: 'z', ctrl: true }) // 'Ctrl+Z' or 'Cmd+Z' on Mac
 */
export function formatKeyBinding(binding: ParsedKeyBinding, forMac?: boolean): string {
  const useMac = forMac ?? isMac();
  const parts: string[] = [];

  if (binding.ctrl) {
    parts.push(useMac ? 'Cmd' : 'Ctrl');
  }
  if (binding.meta && !binding.ctrl) {
    parts.push(useMac ? 'Cmd' : 'Win');
  }
  if (binding.alt) {
    parts.push(useMac ? 'Option' : 'Alt');
  }
  if (binding.shift) {
    parts.push('Shift');
  }
  if (binding.key !== '') {
    parts.push(binding.key.toUpperCase());
  }

  return parts.join('+');
}

// ============================================================================
// Hook
// ============================================================================

/**
 * Hook for registering a single keyboard shortcut.
 *
 * This hook provides fine-grained control over keyboard shortcut behavior,
 * including support for modifier keys, custom targets, and platform-aware
 * handling (Ctrl on Windows/Linux, Cmd on Mac).
 *
 * @example
 * // Basic usage - Ctrl+S to save
 * useKeyboardShortcut({
 *   key: 's',
 *   ctrl: true,
 *   handler: () => saveDocument(),
 * });
 *
 * @example
 * // Conditionally enabled
 * useKeyboardShortcut({
 *   key: 'Escape',
 *   handler: () => closeModal(),
 *   enabled: isModalOpen,
 * });
 *
 * @example
 * // With custom target
 * const editorRef = useRef<HTMLDivElement>(null);
 * useKeyboardShortcut({
 *   key: 'z',
 *   ctrl: true,
 *   handler: () => undo(),
 *   target: editorRef.current,
 * });
 */
export function useKeyboardShortcut(options: KeyboardShortcutOptions): void {
  const {
    key,
    handler,
    ctrl = false,
    alt = false,
    shift = false,
    meta = false,
    enabled = true,
    preventDefault = true,
    stopPropagation = false,
    skipInputs = false,
    target,
    eventType = 'keydown',
  } = options;

  // Store handler in ref to avoid recreating listener on handler changes
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  const handleKeyEvent = useCallback(
    (event: Event): void => {
      if (!enabled) return;
      if (!(event instanceof KeyboardEvent)) return;

      // Skip if user is typing in input/textarea
      if (skipInputs && isInputElement(event.target)) {
        return;
      }

      // Check key match (case-insensitive)
      const eventKey = normalizeKey(event.key);
      const targetKey = normalizeKey(key);
      if (eventKey !== targetKey) return;

      // Check modifier keys (treat ctrl as cmd on Mac for better UX)
      const modifiers = { ctrl, alt, shift, meta };
      const treatCtrlAsMeta = isMac() && ctrl && !meta;
      if (!matchesModifiers(event, modifiers, treatCtrlAsMeta)) return;

      // Handle the event
      if (preventDefault) {
        event.preventDefault();
      }
      if (stopPropagation) {
        event.stopPropagation();
      }

      handlerRef.current(event);
    },
    [key, ctrl, alt, shift, meta, enabled, preventDefault, stopPropagation, skipInputs],
  );

  useEffect(() => {
    if (!enabled) return;

    const targetElement = target ?? (typeof window !== 'undefined' ? window : null);
    if (targetElement === null) return;

    targetElement.addEventListener(eventType, handleKeyEvent as EventListener);

    return (): void => {
      targetElement.removeEventListener(eventType, handleKeyEvent as EventListener);
    };
  }, [target, eventType, handleKeyEvent, enabled]);
}

/**
 * Hook for registering multiple keyboard shortcuts at once using string bindings.
 *
 * @example
 * useKeyboardShortcuts({
 *   'ctrl+s': () => save(),
 *   'ctrl+z': () => undo(),
 *   'ctrl+shift+z': () => redo(),
 *   'escape': () => cancel(),
 * });
 */
export function useKeyBindings(
  bindings: Record<string, () => void>,
  options: Omit<KeyboardShortcutOptions, 'key' | 'handler' | keyof KeyModifiers> = {},
): void {
  const { enabled = true, ...restOptions } = options;

  const handleKeyEvent = useCallback(
    (event: Event): void => {
      if (!enabled) return;
      if (!(event instanceof KeyboardEvent)) return;

      // Skip if user is typing in input/textarea
      if (restOptions.skipInputs === true && isInputElement(event.target)) {
        return;
      }

      for (const [bindingStr, handler] of Object.entries(bindings)) {
        const binding = parseKeyBinding(bindingStr);

        // Check key match
        const eventKey = normalizeKey(event.key);
        if (eventKey !== binding.key) continue;

        // Check modifiers
        const treatCtrlAsMeta = isMac() && binding.ctrl && !binding.meta;
        if (!matchesModifiers(event, binding, treatCtrlAsMeta)) continue;

        // Handle the event
        if (restOptions.preventDefault !== false) {
          event.preventDefault();
        }
        if (restOptions.stopPropagation === true) {
          event.stopPropagation();
        }

        handler();
        break; // Only trigger first matching binding
      }
    },
    [bindings, enabled, restOptions],
  );

  useEffect(() => {
    if (!enabled) return;

    const targetElement = restOptions.target ?? (typeof window !== 'undefined' ? window : null);
    if (targetElement === null) return;

    const eventType = restOptions.eventType ?? 'keydown';
    targetElement.addEventListener(eventType, handleKeyEvent as EventListener);

    return (): void => {
      targetElement.removeEventListener(eventType, handleKeyEvent as EventListener);
    };
  }, [handleKeyEvent, enabled, restOptions.target, restOptions.eventType]);
}
