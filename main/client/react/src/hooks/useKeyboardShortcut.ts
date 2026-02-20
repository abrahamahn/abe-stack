// main/client/react/src/hooks/useKeyboardShortcut.ts
import {
  formatKeyBinding,
  isEditableElement,
  isMac,
  matchesModifiers,
  parseKeyBinding,
  type KeyModifiers,
  type ParsedKeyBinding,
} from '@bslt/client-engine';
import { useCallback, useEffect, useLayoutEffect, useRef } from 'react';

// Re-export shared types and utilities for consumers of this module
export { formatKeyBinding, parseKeyBinding, type KeyModifiers, type ParsedKeyBinding };

// ============================================================================
// Types
// ============================================================================

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
  enabled?: boolean | undefined;
  /**
   * Whether to prevent default browser behavior.
   * @default true
   */
  preventDefault?: boolean | undefined;
  /**
   * Whether to stop propagation of the event.
   * @default false
   */
  stopPropagation?: boolean | undefined;
  /**
   * Whether to skip when user is typing in input/textarea/contenteditable.
   * @default false (different from useKeyboardShortcuts which defaults to true)
   */
  skipInputs?: boolean | undefined;
  /**
   * Target element to attach the listener to.
   * @default window
   */
  target?: EventTarget | null | undefined;
  /**
   * Event type to listen for.
   * @default 'keydown'
   */
  eventType?: 'keydown' | 'keyup' | undefined;
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
  useLayoutEffect(() => {
    handlerRef.current = handler;
  });

  const handleKeyEvent = useCallback(
    (event: Event): void => {
      if (!enabled) return;
      if (!(event instanceof KeyboardEvent)) return;

      // Skip if user is typing in input/textarea
      if (skipInputs && isEditableElement(event.target)) {
        return;
      }

      // Check key match (case-insensitive)
      if (event.key.toLowerCase() !== key.toLowerCase()) return;

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
      if (restOptions.skipInputs === true && isEditableElement(event.target)) {
        return;
      }

      for (const [bindingStr, handler] of Object.entries(bindings)) {
        const binding = parseKeyBinding(bindingStr);

        // Check key match
        if (event.key.toLowerCase() !== binding.key) continue;

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
