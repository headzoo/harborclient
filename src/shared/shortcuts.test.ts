import { describe, expect, it } from 'vitest';
import {
  bindingsToOverrides,
  formatAcceleratorDisplay,
  normalizeShortcutOverrides,
  resolveShortcuts,
  validateShortcutOverrides
} from '#/shared/shortcuts';

describe('normalizeShortcutOverrides', () => {
  it('returns an empty object for invalid input', () => {
    expect(normalizeShortcutOverrides(null)).toEqual({});
    expect(normalizeShortcutOverrides('bad')).toEqual({});
  });

  it('keeps known ids and drops unknown or empty values', () => {
    expect(
      normalizeShortcutOverrides({
        save: 'CmdOrCtrl+Shift+S',
        unknown: 'CmdOrCtrl+K',
        settings: '   '
      })
    ).toEqual({
      save: 'CmdOrCtrl+Shift+S'
    });
  });
});

describe('resolveShortcuts', () => {
  it('uses defaults when no overrides are present', () => {
    const save = resolveShortcuts({}).find((binding) => binding.id === 'save');
    expect(save?.accelerator).toBe('CmdOrCtrl+S');
    expect(save?.defaultAccelerator).toBe('CmdOrCtrl+S');
  });

  it('applies overrides on top of defaults', () => {
    const save = resolveShortcuts({ save: 'CmdOrCtrl+Shift+S' }).find(
      (binding) => binding.id === 'save'
    );
    expect(save?.accelerator).toBe('CmdOrCtrl+Shift+S');
  });
});

describe('bindingsToOverrides', () => {
  it('stores only values that differ from defaults', () => {
    const bindings = resolveShortcuts({ save: 'CmdOrCtrl+Shift+S' });
    expect(bindingsToOverrides(bindings)).toEqual({
      save: 'CmdOrCtrl+Shift+S'
    });
  });
});

describe('validateShortcutOverrides', () => {
  it('accepts valid overrides', () => {
    expect(validateShortcutOverrides({ save: 'CmdOrCtrl+Shift+S' }).valid).toBe(true);
  });

  it('rejects modifier-less letter keys', () => {
    const result = validateShortcutOverrides({ save: 'S' });
    expect(result.valid).toBe(false);
    expect(result.errors.save).toMatch(/modifier/i);
  });

  it('rejects duplicate accelerators', () => {
    const result = validateShortcutOverrides({
      save: 'CmdOrCtrl+Shift+S',
      settings: 'CmdOrCtrl+Shift+S'
    });
    expect(result.valid).toBe(false);
    expect(result.errors.save).toMatch(/already assigned/i);
    expect(result.errors.settings).toMatch(/already assigned/i);
  });

  it('allows standalone function keys', () => {
    expect(validateShortcutOverrides({ 'toggle-fullscreen': 'F11' }).valid).toBe(true);
  });
});

describe('formatAcceleratorDisplay', () => {
  it('formats accelerators for the settings table', () => {
    expect(formatAcceleratorDisplay('CmdOrCtrl+Shift+N')).toBe('ctrl-shift-n');
    expect(formatAcceleratorDisplay('CmdOrCtrl+,')).toBe('ctrl-comma');
    expect(formatAcceleratorDisplay('F11')).toBe('f11');
  });
});
