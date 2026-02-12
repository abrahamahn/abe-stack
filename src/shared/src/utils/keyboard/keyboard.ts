// src/shared/src/utils/keyboard/keyboard.ts
/**
 * Keyboard Utilities
 *
 * Platform detection, key binding parsing, and keyboard event matching.
 * Framework-agnostic — usable in any browser context.
 */

// ============================================================================
// Platform Detection
// ============================================================================

/**
 * Detect if the current platform is macOS/iOS.
 *
 * Uses `navigator.userAgent` since `navigator.platform` is deprecated.
 * Returns false in SSR environments where `navigator` is unavailable.
 */
export function isMac(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /Mac|iPod|iPhone|iPad/.test(navigator.userAgent);
}

// ============================================================================
// Element Detection
// ============================================================================

/**
 * Check if an event target is an editable element (input, textarea, or contentEditable).
 *
 * Useful for keyboard shortcut handlers that should be suppressed when the user
 * is typing in a form field.
 */
export function isEditableElement(target: EventTarget | null): boolean {
  if (target === null || !(target instanceof HTMLElement)) return false;
  return (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target.isContentEditable
  );
}

// ============================================================================
// Key Binding Parsing
// ============================================================================

/**
 * Parsed representation of a key binding string.
 */
export interface ParsedKeyBinding {
  key: string;
  ctrl: boolean;
  alt: boolean;
  shift: boolean;
  meta: boolean;
}

/**
 * Parse a key binding string like "ctrl+shift+z" into structured components.
 *
 * Supports modifier aliases:
 * - ctrl/control
 * - alt/option
 * - shift
 * - meta/cmd/command/win/windows
 *
 * @example
 * parseKeyBinding('ctrl+z')       // { key: 'z', ctrl: true, alt: false, shift: false, meta: false }
 * parseKeyBinding('ctrl+shift+z') // { key: 'z', ctrl: true, alt: false, shift: true, meta: false }
 * parseKeyBinding('alt+backspace') // { key: 'backspace', ctrl: false, alt: true, shift: false, meta: false }
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

// ============================================================================
// Event Matching
// ============================================================================

/**
 * Modifier key flags for keyboard event matching.
 */
export interface KeyModifiers {
  ctrl?: boolean | undefined;
  alt?: boolean | undefined;
  shift?: boolean | undefined;
  meta?: boolean | undefined;
}

/**
 * Check if a keyboard event's modifier keys match the expected modifiers.
 *
 * When `treatCtrlAsMeta` is true (typically on macOS), the ctrl modifier
 * matches either Ctrl or Meta (Cmd), so that "Ctrl+Z" maps to "Cmd+Z" on Mac.
 */
export function matchesModifiers(
  event: KeyboardEvent,
  modifiers: KeyModifiers,
  treatCtrlAsMeta: boolean,
): boolean {
  const { ctrl = false, alt = false, shift = false, meta = false } = modifiers;

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
 * Check if a keyboard event matches a parsed key binding.
 *
 * Automatically handles macOS Cmd-for-Ctrl substitution when the binding
 * specifies `ctrl` but not `meta`.
 *
 * @param event - The keyboard event to test
 * @param binding - The parsed key binding to match against
 * @returns true if the event matches the binding
 */
export function matchesKeyBinding(event: KeyboardEvent, binding: ParsedKeyBinding): boolean {
  if (event.key.toLowerCase() !== binding.key) return false;

  const treatCtrlAsMeta = isMac() && binding.ctrl && !binding.meta;
  return matchesModifiers(event, binding, treatCtrlAsMeta);
}

/**
 * Check if a keyboard event matches any of the given binding strings.
 *
 * @param event - The keyboard event to test
 * @param bindings - Array of binding strings (e.g., ['ctrl+z', 'meta+z'])
 * @returns true if the event matches any binding
 */
export function matchesAnyBinding(event: KeyboardEvent, bindings: string[]): boolean {
  return bindings.some((binding) => matchesKeyBinding(event, parseKeyBinding(binding)));
}

/**
 * Format a parsed key binding for display, adapting labels for the current platform.
 *
 * @example
 * formatKeyBinding({ key: 'z', ctrl: true, alt: false, shift: false, meta: false })
 * // 'Ctrl+Z' on Windows/Linux, 'Cmd+Z' on Mac
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
