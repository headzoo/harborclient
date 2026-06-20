import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type JSX,
  type MouseEvent as ReactMouseEvent
} from 'react';
import type { ConsoleEntry } from '#/renderer/src/store';
import { FaIcon } from '#/renderer/src/components/FaIcon';
import { faXmark } from '#/renderer/src/fontawesome';
import { secondaryButton } from '#/renderer/src/ui/shared/classes';
import { ConsoleEntryRow } from './ConsoleEntryRow';
import { DEFAULT_HEIGHT, MIN_HEIGHT } from './constants';

interface Props {
  /**
   * Console log entries, newest first.
   */
  entries: ConsoleEntry[];

  /**
   * Whether the panel is visible (slides up when true).
   */
  open: boolean;

  /**
   * Closes the console panel.
   */
  onClose: () => void;

  /**
   * Clears all console entries.
   */
  onClear: () => void;
}

/**
 * Slide-up, resizable console panel showing a global request log.
 */
export function ConsolePanel({ entries, open, onClose, onClear }: Props): JSX.Element {
  const [height, setHeight] = useState(DEFAULT_HEIGHT);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const resizingRef = useRef(false);
  const startYRef = useRef(0);
  const startHeightRef = useRef(DEFAULT_HEIGHT);

  const getMaxHeight = useCallback((): number => {
    const container = containerRef.current?.parentElement;
    if (!container) return window.innerHeight * 0.8;
    return container.clientHeight - 40;
  }, []);

  const handleResizeStart = useCallback(
    (event: ReactMouseEvent) => {
      event.preventDefault();
      resizingRef.current = true;
      startYRef.current = event.clientY;
      startHeightRef.current = height;
    },
    [height]
  );

  const handleClose = useCallback(() => {
    setExpandedId(null);
    onClose();
  }, [onClose]);

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent): void => {
      if (!resizingRef.current) return;
      const delta = startYRef.current - event.clientY;
      const maxHeight = getMaxHeight();
      const nextHeight = Math.min(maxHeight, Math.max(MIN_HEIGHT, startHeightRef.current + delta));
      setHeight(nextHeight);
    };

    const handleMouseUp = (): void => {
      resizingRef.current = false;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [getMaxHeight]);

  const toggleExpanded = (id: string): void => {
    setExpandedId((current) => (current === id ? null : id));
  };

  const effectiveExpandedId = open ? expandedId : null;
  const panelClassName = [
    'absolute inset-x-0 bottom-0 z-40 flex flex-col border-t border-separator bg-surface',
    'shadow-[0_-4px_16px_rgba(0,0,0,0.12)] transition-transform duration-300 ease-out app-no-drag',
    open ? 'translate-y-0' : 'translate-y-full'
  ].join(' ');

  return (
    <div ref={containerRef} className={panelClassName} style={{ height }} aria-hidden={!open}>
      <div
        className="flex h-1.5 shrink-0 cursor-row-resize items-center justify-center border-b border-separator bg-control hover:bg-selection/60"
        onMouseDown={handleResizeStart}
        role="separator"
        aria-orientation="horizontal"
        aria-label="Resize console panel"
      >
        <div className="h-0.5 w-8 rounded-full bg-muted/50" />
      </div>

      <div className="flex shrink-0 items-center justify-between border-b border-separator px-3 py-2">
        <div className="flex items-center gap-2 text-[13px] font-medium text-text">
          <span>Console</span>
          {entries.length > 0 && (
            <span className="text-[12px] font-normal text-muted">({entries.length})</span>
          )}
          <button
            type="button"
            className={secondaryButton}
            onClick={onClear}
            disabled={entries.length === 0}
          >
            Clear
          </button>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="inline-flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center rounded-md border-none bg-transparent text-[14px] text-muted hover:bg-selection hover:text-text app-no-drag"
            onClick={handleClose}
            aria-label="Close console"
          >
            <FaIcon icon={faXmark} className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto">
        {entries.length === 0 ? (
          <div className="flex h-full items-center justify-center p-4 text-[13px] text-muted">
            No requests logged yet. Send a request to see it here.
          </div>
        ) : (
          entries.map((entry) => (
            <ConsoleEntryRow
              key={entry.id}
              entry={entry}
              expanded={effectiveExpandedId === entry.id}
              onToggle={() => toggleExpanded(entry.id)}
            />
          ))
        )}
      </div>
    </div>
  );
}
