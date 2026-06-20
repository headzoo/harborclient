/**
 * Compact segment button styles for the footer bar.
 */
export function footerSegment(active: boolean): string {
  return active
    ? 'cursor-pointer rounded-[5px] border-none bg-surface px-2 py-0.5 text-[12px] text-text shadow-sm app-no-drag'
    : 'cursor-pointer rounded-[5px] border-none bg-transparent px-2 py-0.5 text-[12px] text-muted hover:text-text app-no-drag';
}
