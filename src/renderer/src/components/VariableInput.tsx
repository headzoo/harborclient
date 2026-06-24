import { useEffect, useMemo, useRef, useState, type JSX, type KeyboardEvent } from 'react';
import { Input } from '#/renderer/src/components/forms';
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

  /**
   * Classes applied to the outer wrapper (e.g. field border and tint for table cells).
   */
  wrapperClassName?: string;

  /**
   * Opens collection settings to edit the hovered variable.
   */
  onEditVariable?: () => void;

  /**
   * DOM id forwarded to the underlying input for label association.
   */
  id?: string;

  /**
   * Accessible name when no visible label is associated via `htmlFor`.
   */
  'aria-label'?: string;

  /**
   * Id of the element that labels this input when using `aria-labelledby`.
   */
  'aria-labelledby'?: string;
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
  className = '',
  wrapperClassName,
  onEditVariable,
  id,
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledBy
}: Props): JSX.Element {
  const inputRef = useRef<HTMLInputElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const spanRefs = useRef<Map<number, HTMLSpanElement>>(new Map());
  const hideTimer = useRef<number | null>(null);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);

  /**
   * Splits the input value into plain text and {{variable}} token spans for highlighting.
   */
  const tokens = useMemo(() => tokenizeVariables(value), [value]);

  /**
   * Clears any pending tooltip hide timer.
   */
  const cancelHide = (): void => {
    if (hideTimer.current != null) {
      window.clearTimeout(hideTimer.current);
      hideTimer.current = null;
    }
  };

  /**
   * Hides the tooltip after a short grace period so the pointer can reach it.
   */
  const scheduleHide = (): void => {
    cancelHide();
    hideTimer.current = window.setTimeout(() => setTooltip(null), 120);
  };

  /**
   * Clears any pending tooltip hide timer when the component unmounts.
   */
  useEffect(() => () => cancelHide(), []);

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
    cancelHide();

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
    <div
      className={
        wrapperClassName ? `relative min-w-0 ${wrapperClassName}` : 'relative min-w-0 flex-1'
      }
    >
      <div
        ref={backdropRef}
        aria-hidden
        className="pointer-events-none absolute inset-0 overflow-hidden whitespace-nowrap px-2 py-1.5 text-[14px] text-inherit"
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

      <Input
        ref={inputRef}
        id={id}
        variant="plain"
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledBy}
        className={`relative w-full min-w-0 border-none bg-transparent px-2 py-1.5 text-[14px] text-transparent caret-text focus-visible:shadow-none ${className}`}
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        onScroll={syncScroll}
        onMouseMove={handleMouseMove}
        onMouseLeave={scheduleHide}
      />

      {tooltip && (
        <div
          className="pointer-events-auto fixed z-50 flex max-w-sm -translate-x-1/2 -translate-y-full flex-col gap-1.5 rounded-md border border-separator bg-surface px-3 py-2 text-[14px] text-text shadow-md"
          style={{ top: tooltip.top - 4, left: tooltip.left }}
          onMouseEnter={cancelHide}
          onMouseLeave={() => setTooltip(null)}
        >
          {tooltip.value !== undefined ? (
            tooltip.value
          ) : (
            <span className="text-muted">Not defined</span>
          )}
          {onEditVariable && (
            <button
              type="button"
              className="self-start text-[14px] text-accent hover:underline app-no-drag"
              onClick={() => {
                onEditVariable();
                setTooltip(null);
              }}
            >
              Edit value
            </button>
          )}
        </div>
      )}
    </div>
  );
}
