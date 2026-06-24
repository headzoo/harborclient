import type { Variable } from '#/shared/types';

/**
 * Drops variable rows with no key, value, or default content.
 *
 * @param variables - Raw variable rows from a form.
 * @returns Non-empty rows safe to persist.
 */
export const cleanVariables = (variables: Variable[]): Variable[] =>
  variables.filter((v) => v.key.trim() || v.value.trim() || v.defaultValue.trim());

/**
 * Options for resolving keyboard navigation within a tab list or radio group.
 */
export interface TabListKeyOptions {
  /**
   * Indices of items that cannot be selected via keyboard navigation.
   */
  disabledIndices?: number[];
}

/**
 * Returns whether an item index is enabled for keyboard selection.
 *
 * @param index - Candidate item index.
 * @param disabled - Set of disabled indices.
 * @returns True when the index is not disabled.
 */
function isEnabled(index: number, disabled: Set<number>): boolean {
  return !disabled.has(index);
}

/**
 * Returns the first enabled item index, or null when none exist.
 *
 * @param disabled - Set of disabled indices.
 * @param itemCount - Total number of items in the list.
 * @returns First enabled index, or null.
 */
function firstEnabled(disabled: Set<number>, itemCount: number): number | null {
  for (let index = 0; index < itemCount; index++) {
    if (isEnabled(index, disabled)) return index;
  }
  return null;
}

/**
 * Returns the last enabled item index, or null when none exist.
 *
 * @param disabled - Set of disabled indices.
 * @param itemCount - Total number of items in the list.
 * @returns Last enabled index, or null.
 */
function lastEnabled(disabled: Set<number>, itemCount: number): number | null {
  for (let index = itemCount - 1; index >= 0; index--) {
    if (isEnabled(index, disabled)) return index;
  }
  return null;
}

/**
 * Walks circularly from the current index in the given direction to the next
 * enabled item.
 *
 * @param current - Index of the currently focused item.
 * @param direction - `1` for forward, `-1` for backward.
 * @param disabled - Set of disabled indices.
 * @param itemCount - Total number of items in the list.
 * @returns Next enabled index, or null when only one enabled item exists.
 */
function nextEnabled(
  current: number,
  direction: 1 | -1,
  disabled: Set<number>,
  itemCount: number
): number | null {
  for (let step = 1; step < itemCount; step++) {
    const index = (current + direction * step + itemCount) % itemCount;
    if (isEnabled(index, disabled)) return index;
  }
  return null;
}

/**
 * Resolves arrow, Home, and End keys to the next selectable index in a
 * horizontal tab list or radio group.
 *
 * @param key - Keyboard event key value.
 * @param currentIndex - Index of the currently selected item.
 * @param itemCount - Total number of visible items.
 * @param options - Optional disabled indices.
 * @returns Target index when the key is handled, or null otherwise.
 */
export function resolveTabListKeyAction(
  key: string,
  currentIndex: number,
  itemCount: number,
  options?: TabListKeyOptions
): number | null {
  if (itemCount <= 0) return null;

  const disabled = new Set(options?.disabledIndices ?? []);

  if (key === 'Home') return firstEnabled(disabled, itemCount);
  if (key === 'End') return lastEnabled(disabled, itemCount);
  if (key === 'ArrowRight' || key === 'ArrowDown') {
    return nextEnabled(currentIndex, 1, disabled, itemCount);
  }
  if (key === 'ArrowLeft' || key === 'ArrowUp') {
    return nextEnabled(currentIndex, -1, disabled, itemCount);
  }
  return null;
}
