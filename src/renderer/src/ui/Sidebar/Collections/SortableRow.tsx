import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { type CSSProperties, type JSX, type ReactNode } from 'react';
import { FaIcon } from '#/renderer/src/components/FaIcon';
import { faGripVertical } from '#/renderer/src/fontawesome';

interface Props {
  /**
   * Stable dnd-kit sortable id for this row.
   */
  id: string;

  /**
   * Row container class names.
   */
  className: string;

  /**
   * Accessible name for the drag handle (e.g. "Reorder collection \"API\"").
   */
  dragHandleLabel: string;

  /**
   * Row contents, typically label and action controls.
   */
  children: ReactNode;

  /**
   * When true, renders a static row without drag-and-drop behavior.
   */
  disabled?: boolean;
}

/**
 * Wraps a sidebar row with dnd-kit sortable drag behavior, a dedicated drag
 * handle for pointer and keyboard reordering, and opacity feedback while dragging.
 */
export function SortableRow({
  id,
  className,
  dragHandleLabel,
  children,
  disabled = false
}: Props): JSX.Element {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id, disabled });

  if (disabled) {
    return (
      <div className={`group ${className}`}>
        <span className="inline-flex h-5 w-5 shrink-0" aria-hidden="true" />
        {children}
      </div>
    );
  }

  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.45 : undefined
  };

  return (
    <div ref={setNodeRef} style={style} className={className}>
      <button
        type="button"
        ref={setActivatorNodeRef}
        className="inline-flex h-5 w-5 shrink-0 cursor-grab items-center justify-center rounded border-none bg-transparent p-0 text-muted opacity-0 transition-opacity hover:text-text focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent active:cursor-grabbing group-hover:opacity-100 app-no-drag"
        aria-label={dragHandleLabel}
        {...attributes}
        {...listeners}
      >
        <FaIcon icon={faGripVertical} className="h-3 w-3" />
      </button>
      {children}
    </div>
  );
}
