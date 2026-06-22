import { describe, expect, it } from 'vitest';
import { resolveTabListKeyAction } from '#/renderer/src/components/tabListKeyboard';

describe('resolveTabListKeyAction', () => {
  it('returns null for unhandled keys', () => {
    expect(resolveTabListKeyAction('Enter', 0, 3)).toBeNull();
    expect(resolveTabListKeyAction('Tab', 1, 3)).toBeNull();
  });

  it('returns null when itemCount is zero', () => {
    expect(resolveTabListKeyAction('ArrowRight', 0, 0)).toBeNull();
  });

  it('moves forward and backward with arrow keys', () => {
    expect(resolveTabListKeyAction('ArrowRight', 0, 3)).toBe(1);
    expect(resolveTabListKeyAction('ArrowDown', 1, 3)).toBe(2);
    expect(resolveTabListKeyAction('ArrowLeft', 0, 3)).toBe(2);
    expect(resolveTabListKeyAction('ArrowUp', 2, 3)).toBe(1);
  });

  it('jumps to first and last enabled items with Home and End', () => {
    expect(resolveTabListKeyAction('Home', 2, 3)).toBe(0);
    expect(resolveTabListKeyAction('End', 0, 3)).toBe(2);
  });

  it('skips disabled indices when navigating', () => {
    expect(resolveTabListKeyAction('ArrowRight', 0, 3, { disabledIndices: [1] })).toBe(2);
    expect(resolveTabListKeyAction('ArrowLeft', 2, 3, { disabledIndices: [1] })).toBe(0);
    expect(resolveTabListKeyAction('Home', 2, 3, { disabledIndices: [0] })).toBe(1);
    expect(resolveTabListKeyAction('End', 0, 3, { disabledIndices: [2] })).toBe(1);
  });
});
