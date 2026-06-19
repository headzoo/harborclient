import { useMemo, useRef, useState, type JSX, type KeyboardEvent } from 'react';
import type { Variable } from '#/shared/types';
import { resolveVariable, tokenizeVariables } from '#/renderer/src/store';

interface TooltipState {
  key: string;
  value: string | undefined;
  top: number;
  left: number;
}

interface Props {
  /**
   * Current input value.
   */
  value: string;

  /**
   * Called when the value changes.
   *
   * @param value - Updated input value.
   */
  onChange: (value: string) => void;

  /**
   * Collection-scoped variables for highlighting and tooltips.
   */
  variables: Variable[];

  /**
   * Placeholder shown when value is empty.
   */
  placeholder?: string;

  /**
   * Optional keyboard handler (e.g. Enter to submit).
   */
  onKeyDown?: (e: KeyboardEvent<HTMLInputElement>) => void;

  /**
   * Additional classes applied to the input element.
   */
  className?: string;
}

/**
 * Text input that highlights {{variable}} tokens and shows resolved values on hover.
 */
export function VariableInput({
  value,
  onChange,
  variables,
  placeholder,
  onKeyDown,
  className = ''
}: Props): JSX.Element {
  const inputRef = useRef<HTMLInputElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const spanRefs = useRef<Map<number, HTMLSpanElement>>(new Map());
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);

  const tokens = useMemo(() => tokenizeVariables(value), [value]);

  /**
   * Keeps the colored backdrop aligned with horizontal scroll in the input.
   */
  const syncScroll = (): void => {
    const input = inputRef.current;
    const backdrop = backdropRef.current;
    if (input && backdrop) {
      backdrop.scrollLeft = input.scrollLeft;
    }
  };

  /**
   * Shows a tooltip when the pointer is over a variable token span.
   *
   * @param e - Mouse move event from the input.
   */
  const handleMouseMove = (e: React.MouseEvent<HTMLInputElement>): void => {
    for (const [index, token] of tokens.entries()) {
      if (!token.key) continue;

      const span = spanRefs.current.get(index);
      if (!span) continue;

      const rect = span.getBoundingClientRect();
      if (
        e.clientX >= rect.left &&
        e.clientX <= rect.right &&
        e.clientY >= rect.top &&
        e.clientY <= rect.bottom
      ) {
        setTooltip({
          key: token.key,
          value: resolveVariable(token.key, variables),
          top: rect.top,
          left: rect.left + rect.width / 2
        });
        return;
      }
    }

    setTooltip(null);
  };

  return (
    <div className="relative min-w-0 flex-1">
      <div
        ref={backdropRef}
        aria-hidden
        className="pointer-events-none absolute inset-0 overflow-hidden whitespace-nowrap px-2 py-1.5 text-[13px] text-inherit"
      >
        {value ? (
          tokens.map((token, index) =>
            token.key ? (
              <span
                key={index}
                ref={(el) => {
                  if (el) spanRefs.current.set(index, el);
                  else spanRefs.current.delete(index);
                }}
                className="text-[#32D2E2]"
              >
                {token.text}
              </span>
            ) : (
              <span key={index}>{token.text}</span>
            )
          )
        ) : (
          <span className="text-muted">{placeholder}</span>
        )}
      </div>

      <input
        ref={inputRef}
        className={`relative w-full min-w-0 border-none bg-transparent px-2 py-1.5 text-[13px] text-transparent caret-text focus-visible:shadow-none ${className}`}
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        onScroll={syncScroll}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setTooltip(null)}
      />

      {tooltip && (
        <div
          className="pointer-events-none fixed z-50 max-w-xs -translate-x-1/2 -translate-y-full rounded-md border border-separator bg-surface px-2 py-1 text-[12px] text-text shadow-md"
          style={{ top: tooltip.top - 4, left: tooltip.left }}
        >
          {tooltip.value !== undefined ? (
            tooltip.value
          ) : (
            <span className="text-muted">Not defined</span>
          )}
        </div>
      )}
    </div>
  );
}
