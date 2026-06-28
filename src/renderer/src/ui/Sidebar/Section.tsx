import { Button, FaIcon } from '@harborclient/sdk/components';
import type { JSX, ReactNode } from 'react';

import { faChevronDown, faChevronRight, faPlus } from '#/renderer/src/fontawesome';

interface Props {
  /**
   * Section title shown in the header.
   */
  title: string;

  /**
   * Whether the section body is expanded.
   */
  expanded: boolean;

  /**
   * Toggles section expansion.
   */
  onToggle: () => void;

  /**
   * Section body content.
   */
  children: ReactNode;

  /**
   * Called when the add button is clicked.
   */
  onAdd?: () => void;

  /**
   * Accessible label for the add button.
   */
  addLabel?: string;

  /**
   * Optional action controls rendered in the header row (for example plugin header actions).
   */
  headerActions?: ReactNode;
}

/**
 * Collapsible sidebar section with optional add action.
 */
export function Section({
  title,
  expanded,
  onToggle,
  children,
  onAdd,
  addLabel,
  headerActions
}: Props): JSX.Element {
  return (
    <div className="mb-3">
      <div className="-mx-2 mb-1 flex items-center justify-between gap-2 bg-sidebar-section px-2 py-3">
        <button
          type="button"
          className="inline-flex min-w-0 flex-1 cursor-pointer items-center gap-1 border-none bg-transparent p-0 text-left app-no-drag"
          onClick={onToggle}
          aria-expanded={expanded}
        >
          <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center">
            <FaIcon
              icon={expanded ? faChevronDown : faChevronRight}
              className="h-3 w-3 text-muted"
            />
          </span>
          <h2 className="m-0 text-[14px] font-medium uppercase tracking-wide text-muted">
            {title}
          </h2>
        </button>
        {(headerActions || onAdd) && (
          <div className="flex shrink-0 items-center gap-1">
            {headerActions}
            {onAdd && (
              <Button
                type="button"
                variant="toolbar"
                title={addLabel ?? 'Add'}
                aria-label={addLabel ?? 'Add'}
                className="inline-flex items-center gap-1"
                onClick={onAdd}
              >
                <FaIcon icon={faPlus} className="h-3 w-3" />
              </Button>
            )}
          </div>
        )}
      </div>
      {expanded && children}
    </div>
  );
}
