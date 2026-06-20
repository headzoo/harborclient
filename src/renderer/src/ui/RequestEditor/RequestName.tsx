import { useEffect, useRef, useState, type JSX } from 'react';

interface Props {
  /**
   * Current request name.
   */
  name: string;

  /**
   * Name of the collection this request belongs to, for display as a breadcrumb prefix.
   */
  collectionName?: string;

  /**
   * Called when the request name changes.
   */
  onNameChange: (name: string) => void;
}

/**
 * Inline-editable request name with optional collection breadcrumb.
 */
export function RequestName({ name, collectionName, onNameChange }: Props): JSX.Element {
  const [editingName, setEditingName] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingName) {
      nameInputRef.current?.focus();
      nameInputRef.current?.select();
    }
  }, [editingName]);

  return (
    <div className="mb-2">
      {editingName ? (
        <div className="flex min-w-0 max-w-xs items-center gap-1">
          {collectionName && (
            <>
              <span className="shrink-0 text-[15px] font-normal text-muted">{collectionName}</span>
              <span className="shrink-0 text-[15px] font-normal text-muted">&gt;</span>
            </>
          )}
          <input
            ref={nameInputRef}
            className="min-w-0 flex-1 border-none bg-transparent p-0 text-[15px] font-semibold text-text outline-none app-no-drag"
            type="text"
            value={name}
            onChange={(e) => onNameChange(e.target.value)}
            onBlur={() => setEditingName(false)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === 'Escape') {
                e.preventDefault();
                setEditingName(false);
              }
            }}
          />
        </div>
      ) : (
        <button
          type="button"
          className="min-w-0 max-w-xs cursor-text border-none bg-transparent p-0 text-left text-[15px] font-semibold text-text hover:opacity-80 app-no-drag"
          onClick={() => setEditingName(true)}
        >
          {collectionName && (
            <>
              <span className="font-normal text-muted">{collectionName}</span>
              <span className="font-normal text-muted"> &gt; </span>
            </>
          )}
          {name ? name : <span className="text-muted">Request name</span>}
        </button>
      )}
    </div>
  );
}
