import type {
  JSX,
  KeyboardEvent as ReactKeyboardEvent,
  MouseEvent as ReactMouseEvent
} from 'react';

interface Props {
  /**
   * Handle orientation: horizontal resizes height, vertical resizes width.
   */
  orientation: 'horizontal' | 'vertical';

  /**
   * Current panel size in pixels for valued separator semantics.
   */
  value: number;

  /**
   * Minimum allowed panel size in pixels.
   */
  min: number;

  /**
   * Maximum allowed panel size in pixels.
   */
  max: number;

  /**
   * Called when the user starts dragging the handle.
   */
  onResizeStart: (event: ReactMouseEvent) => void;

  /**
   * Called when the user presses arrow keys on the focused handle.
   */
  onKeyboardResize: (event: ReactKeyboardEvent) => void;

  /**
   * Accessible label for the separator.
   */
  ariaLabel: string;

  /**
   * Optional additional classes for the handle container.
   */
  className?: string;
}

/**
 * Draggable separator handle for resizable panels.
 */
export function ResizeHandle({
  orientation,
  value,
  min,
  max,
  onResizeStart,
  onKeyboardResize,
  ariaLabel,
  className
}: Props): JSX.Element {
  const isHorizontal = orientation === 'horizontal';
  const containerClassName = [
    'm-0 flex shrink-0 items-center justify-center bg-control p-0 font-inherit text-inherit appearance-none hover:bg-selection/60 app-no-drag',
    isHorizontal
      ? 'h-1.5 w-full cursor-row-resize border-b border-separator'
      : 'h-full w-1.5 cursor-col-resize border-r border-separator',
    className
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button
      type="button"
      className={containerClassName}
      onMouseDown={onResizeStart}
      onKeyDown={onKeyboardResize}
      role="separator"
      aria-orientation={orientation}
      aria-label={ariaLabel}
      aria-valuenow={Math.round(value)}
      aria-valuemin={min}
      aria-valuemax={Math.round(max)}
    >
      <div
        className={
          isHorizontal ? 'h-0.5 w-8 rounded-full bg-muted/50' : 'h-8 w-0.5 rounded-full bg-muted/50'
        }
        aria-hidden
      />
    </button>
  );
}
