import type { MenuItem } from '#/renderer/src/components/RowActionsMenu';

/**
 * Builds an optional reorder group for move-up/move-down row actions.
 *
 * Returns one menu group when the row can move in at least one direction,
 * otherwise an empty array so callers can spread it into `groups`.
 *
 * @param index - Zero-based position of the row in its list.
 * @param length - Total number of rows in the list.
 * @param onMove - Called with the direction to move the row.
 */
export function buildReorderMenuGroup(
  index: number,
  length: number,
  onMove: (direction: 'up' | 'down') => void
): MenuItem[][] {
  if (index <= 0 && index >= length - 1) {
    return [];
  }

  const items: MenuItem[] = [];

  if (index > 0) {
    items.push({
      label: 'Move up',
      onSelect: () => void onMove('up')
    });
  }

  if (index < length - 1) {
    items.push({
      label: 'Move down',
      onSelect: () => void onMove('down')
    });
  }

  return items.length > 0 ? [items] : [];
}
