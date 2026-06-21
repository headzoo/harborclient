import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { type CSSProperties, type JSX, type ReactNode } from 'react';

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
   * Row contents, typically label and action controls.
   */
  children: ReactNode;
}

/**
 * Wraps a sidebar row with dnd-kit sortable drag behavior and opacity feedback while dragging.
 */
export function SortableRow({ id, className, children }: Props): JSX.Element {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id
  });
  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.45 : undefined
  };

  return (
    <div ref={setNodeRef} style={style} className={className} {...attributes} {...listeners}>
      {children}
    </div>
  );
}
