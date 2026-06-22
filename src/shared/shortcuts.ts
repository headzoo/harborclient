import type { MenuActionId } from '#/shared/types';

/**
 * Identifiers for user-configurable keyboard shortcuts.
 */
export type ShortcutId =
  | 'new-request'
  | 'new-collection'
  | 'save'
  | 'settings'
  | 'undo'
  | 'redo'
  | 'cut'
  | 'copy'
  | 'paste'
  | 'select-all'
  | 'toggle-fullscreen'
  | 'zoom-in'
  | 'zoom-out';

/**
 * Electron menu role names used by built-in shortcuts.
 */
export type ShortcutRole =
  | 'undo'
  | 'redo'
  | 'cut'
  | 'copy'
  | 'paste'
  | 'selectAll'
  | 'togglefullscreen'
  | 'zoomIn'
  | 'zoomOut';

/**
 * Definition of a configurable shortcut in the central registry.
 */
export interface ShortcutDef {
  /** Stable shortcut identifier. */
  id: ShortcutId;
  /** User-facing label shown in the settings table. */
  label: string;
  /** Default Electron accelerator string. */
  defaultAccelerator: string;
  /** Whether the shortcut dispatches a custom menu action or uses an Electron role. */
  kind: 'action' | 'role';
  /** Custom menu action id when `kind` is `action`. */
  actionId?: MenuActionId;
  /** Electron menu role when `kind` is `role`. */
  role?: ShortcutRole;
}

/**
 * Persisted user overrides keyed by shortcut id.
 */
export type ShortcutOverrides = Partial<Record<ShortcutId, string>>;

/**
 * Resolved shortcut binding returned to the renderer and used when building menus.
 */
export interface ShortcutBinding {
  /** Stable shortcut identifier. */
  id: ShortcutId;
  /** User-facing label. */
  label: string;
  /** Effective accelerator after applying overrides. */
  accelerator: string;
  /** Default accelerator from the registry. */
  defaultAccelerator: string;
}

/**
 * Validation result for shortcut override maps.
 */
export interface ShortcutValidationResult {
  /** True when all bindings are valid and non-conflicting. */
  valid: boolean;
  /** Per-shortcut error messages keyed by shortcut id. */
  errors: Partial<Record<ShortcutId, string>>;
}

/**
 * Canonical list of configurable shortcuts in display order.
 */
export const SHORTCUT_DEFS: ShortcutDef[] = [
  {
    id: 'new-request',
    label: 'New request',
    defaultAccelerator: 'CmdOrCtrl+N',
    kind: 'action',
    actionId: 'new-request'
  },
  {
    id: 'new-collection',
    label: 'New collection',
    defaultAccelerator: 'CmdOrCtrl+Shift+N',
    kind: 'action',
    actionId: 'new-collection'
  },
  {
    id: 'save',
    label: 'Save request',
    defaultAccelerator: 'CmdOrCtrl+S',
    kind: 'action',
    actionId: 'save'
  },
  {
    id: 'settings',
    label: 'Settings',
    defaultAccelerator: 'CmdOrCtrl+,',
    kind: 'action',
    actionId: 'settings'
  },
  {
    id: 'undo',
    label: 'Undo',
    defaultAccelerator: 'CmdOrCtrl+Z',
    kind: 'role',
    role: 'undo'
  },
  {
    id: 'redo',
    label: 'Redo',
    defaultAccelerator: 'CmdOrCtrl+Shift+Z',
    kind: 'role',
    role: 'redo'
  },
  {
    id: 'cut',
    label: 'Cut',
    defaultAccelerator: 'CmdOrCtrl+X',
    kind: 'role',
    role: 'cut'
  },
  {
    id: 'copy',
    label: 'Copy',
    defaultAccelerator: 'CmdOrCtrl+C',
    kind: 'role',
    role: 'copy'
  },
  {
    id: 'paste',
    label: 'Paste',
    defaultAccelerator: 'CmdOrCtrl+V',
    kind: 'role',
    role: 'paste'
  },
  {
    id: 'select-all',
    label: 'Select all',
    defaultAccelerator: 'CmdOrCtrl+A',
    kind: 'role',
    role: 'selectAll'
  },
  {
    id: 'toggle-fullscreen',
    label: 'Toggle full screen',
    defaultAccelerator: 'F11',
    kind: 'role',
    role: 'togglefullscreen'
  },
  {
    id: 'zoom-in',
    label: 'Zoom in',
    defaultAccelerator: 'CmdOrCtrl+Plus',
    kind: 'role',
    role: 'zoomIn'
  },
  {
    id: 'zoom-out',
    label: 'Zoom out',
    defaultAccelerator: 'CmdOrCtrl+-',
    kind: 'role',
    role: 'zoomOut'
  }
];

const SHORTCUT_DEF_BY_ID = new Map(SHORTCUT_DEFS.map((def) => [def.id, def]));

/**
 * Returns the shortcut definition for an id, if known.
 *
 * @param id - Shortcut identifier.
 * @returns Matching definition or undefined.
 */
export function getShortcutDef(id: ShortcutId): ShortcutDef | undefined {
  return SHORTCUT_DEF_BY_ID.get(id);
}

/**
 * Normalizes persisted shortcut overrides by dropping unknown ids and invalid values.
 *
 * @param raw - Raw value from storage or IPC input.
 * @returns Sanitized override map.
 */
export function normalizeShortcutOverrides(raw: unknown): ShortcutOverrides {
  if (typeof raw !== 'object' || raw === null) {
    return {};
  }

  const result: ShortcutOverrides = {};
  for (const [key, value] of Object.entries(raw)) {
    if (!SHORTCUT_DEF_BY_ID.has(key as ShortcutId)) {
      continue;
    }
    if (typeof value !== 'string') {
      continue;
    }
    const trimmed = value.trim();
    if (trimmed.length === 0) {
      continue;
    }
    result[key as ShortcutId] = trimmed;
  }
  return result;
}

/**
 * Merges defaults with user overrides into resolved shortcut bindings.
 *
 * @param overrides - User overrides keyed by shortcut id.
 * @returns Resolved bindings in registry order.
 */
export function resolveShortcuts(overrides: ShortcutOverrides): ShortcutBinding[] {
  return SHORTCUT_DEFS.map((def) => {
    const override = overrides[def.id];
    const accelerator =
      override != null && override.trim().length > 0 ? override.trim() : def.defaultAccelerator;
    return {
      id: def.id,
      label: def.label,
      accelerator,
      defaultAccelerator: def.defaultAccelerator
    };
  });
}

/**
 * Builds a lookup map from shortcut id to effective accelerator.
 *
 * @param overrides - User overrides keyed by shortcut id.
 * @returns Map of shortcut id to accelerator string.
 */
export function resolveAcceleratorMap(overrides: ShortcutOverrides): Map<ShortcutId, string> {
  return new Map(resolveShortcuts(overrides).map((binding) => [binding.id, binding.accelerator]));
}

/**
 * Converts resolved bindings to a persisted override map (non-default values only).
 *
 * @param bindings - Resolved shortcut bindings.
 * @returns Overrides containing only values that differ from defaults.
 */
export function bindingsToOverrides(bindings: ShortcutBinding[]): ShortcutOverrides {
  const overrides: ShortcutOverrides = {};
  for (const binding of bindings) {
    if (binding.accelerator !== binding.defaultAccelerator) {
      overrides[binding.id] = binding.accelerator;
    }
  }
  return overrides;
}

/**
 * Normalizes an accelerator string for duplicate comparison.
 *
 * @param accelerator - Electron accelerator string.
 * @returns Lowercase normalized accelerator.
 */
function normalizeAcceleratorKey(accelerator: string): string {
  return accelerator.trim().toLowerCase();
}

/**
 * Returns true when an accelerator includes a modifier or is a standalone function key.
 *
 * @param accelerator - Electron accelerator string.
 * @returns Whether the accelerator is allowed without conflicting with plain typing.
 */
function hasRequiredModifier(accelerator: string): boolean {
  const parts = accelerator.split('+').map((part) => part.trim());
  if (parts.length === 0) {
    return false;
  }

  const key = parts[parts.length - 1] ?? '';
  if (parts.length === 1 && /^F([1-9]|1[0-2])$/i.test(key)) {
    return true;
  }

  const modifiers = parts.slice(0, -1);
  return modifiers.some((part) =>
    /^(CmdOrCtrl|Alt|Shift|Cmd|Ctrl|Meta|Command|Control)$/i.test(part)
  );
}

/**
 * Returns true when the accelerator matches Electron's expected token pattern.
 *
 * @param accelerator - Electron accelerator string.
 * @returns Whether the accelerator appears well-formed.
 */
function isValidAccelerator(accelerator: string): boolean {
  const trimmed = accelerator.trim();
  if (trimmed.length === 0) {
    return false;
  }

  const parts = trimmed.split('+').map((part) => part.trim());
  if (parts.some((part) => part.length === 0)) {
    return false;
  }

  const key = parts[parts.length - 1] ?? '';
  if (/^F([1-9]|1[0-2])$/i.test(key)) {
    return true;
  }

  if (/^[A-Za-z0-9]$/.test(key)) {
    return true;
  }

  const namedKeys = new Set([
    'Plus',
    'Minus',
    'Equal',
    'Comma',
    'Period',
    'Slash',
    'Backslash',
    'Backquote',
    'BracketLeft',
    'BracketRight',
    'Semicolon',
    'Quote',
    'Space',
    'Tab',
    'Enter',
    'Escape',
    'Backspace',
    'Delete',
    'Up',
    'Down',
    'Left',
    'Right',
    'Home',
    'End',
    'PageUp',
    'PageDown',
    ',',
    '-',
    '+',
    '.',
    '/',
    '\\',
    '`',
    '[',
    ']',
    ';',
    "'"
  ]);

  return namedKeys.has(key);
}

/**
 * Validates shortcut overrides for shape, modifier requirements, and conflicts.
 *
 * @param overrides - User overrides keyed by shortcut id.
 * @returns Validation result with per-shortcut error messages.
 */
export function validateShortcutOverrides(overrides: ShortcutOverrides): ShortcutValidationResult {
  const bindings = resolveShortcuts(overrides);
  const errors: Partial<Record<ShortcutId, string>> = {};
  const byAccelerator = new Map<string, ShortcutId[]>();

  for (const binding of bindings) {
    if (!isValidAccelerator(binding.accelerator)) {
      errors[binding.id] = 'Invalid key combination.';
      continue;
    }

    if (!hasRequiredModifier(binding.accelerator)) {
      errors[binding.id] = 'Include a modifier key (Ctrl, Alt, or Shift) or use a function key.';
      continue;
    }

    const normalized = normalizeAcceleratorKey(binding.accelerator);
    const existing = byAccelerator.get(normalized) ?? [];
    existing.push(binding.id);
    byAccelerator.set(normalized, existing);
  }

  for (const ids of byAccelerator.values()) {
    if (ids.length <= 1) {
      continue;
    }
    for (const id of ids) {
      errors[id] = 'This key combination is already assigned to another shortcut.';
    }
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors
  };
}

/**
 * Formats an Electron accelerator for display in the settings table.
 *
 * @param accelerator - Electron accelerator string.
 * @returns Human-readable accelerator such as `ctrl+s`.
 */
export function formatAcceleratorDisplay(accelerator: string): string {
  const keyDisplayNames: Record<string, string> = {
    Plus: 'plus',
    Minus: 'minus',
    Equal: 'equal',
    Comma: 'comma',
    Period: 'period',
    ',': 'comma',
    '-': 'minus',
    '+': 'plus'
  };

  return accelerator
    .replace(/CmdOrCtrl/gi, 'ctrl')
    .replace(/CommandOrControl/gi, 'ctrl')
    .replace(/Command/gi, 'cmd')
    .replace(/Control/gi, 'ctrl')
    .replace(/Cmd/gi, 'cmd')
    .replace(/Meta/gi, 'cmd')
    .replace(/Alt/gi, 'alt')
    .replace(/Shift/gi, 'shift')
    .split('+')
    .map((part) => {
      const trimmed = part.trim();
      const mapped = keyDisplayNames[trimmed] ?? keyDisplayNames[trimmed.toLowerCase()];
      return (mapped ?? trimmed).toLowerCase();
    })
    .join('-');
}
