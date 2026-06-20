import type { JSX } from 'react';

interface Props {
  headers: Record<string, string>;
}

/**
 * Response headers key/value table.
 */
export function ResponseHeaders({ headers }: Props): JSX.Element {
  return (
    <div className="overflow-hidden rounded-md border border-separator">
      {Object.entries(headers).length === 0 ? (
        <div className="p-4 text-center text-[13px] text-muted">No headers</div>
      ) : (
        Object.entries(headers).map(([key, value], index) => (
          <div
            className={`grid grid-cols-[180px_1fr] gap-3 px-2.5 py-1.5 ${index > 0 ? 'border-t border-separator' : ''}`}
            key={key}
          >
            <span className="break-words text-[13px] font-medium">{key}</span>
            <span className="break-words font-mono text-[12px] text-text-secondary">{value}</span>
          </div>
        ))
      )}
    </div>
  );
}
