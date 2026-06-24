import { useEffect, useRef, type JSX, type ReactNode } from 'react';
import { useDialogFocus } from '#/renderer/src/hooks/useDialogFocus';

interface BaseProps {
  /**
   * Called when the backdrop is clicked or Escape is pressed.
   */
  onClose: () => void;

  /**
   * Optional width class for the dialog panel (defaults to w-96).
   */
  className?: string;

  /**
   * When true, Escape does not call `onClose` (e.g. modals that require an explicit button).
   */
  disableEscape?: boolean;

  children: ReactNode;
}

type Props = BaseProps &
  (
    | {
        /**
         * Id of the element that labels the dialog (typically the heading).
         */
        labelledBy: string;
        label?: never;
      }
    | {
        labelledBy?: never;
        /**
         * Accessible name when no visible heading is linked via `labelledBy`.
         */
        label: string;
      }
  );

/**
 * Shared modal backdrop and panel wrapper used by all application dialogs.
 */
export function Modal({
  onClose,
  className = 'w-96',
  disableEscape = false,
  labelledBy,
  label,
  children
}: Props): JSX.Element {
  const panelRef = useRef<HTMLDivElement>(null);

  useDialogFocus(panelRef);

  /**
   * Closes the modal when Escape is pressed unless disabled.
   */
  useEffect(() => {
    if (disableEscape) return;

    /**
     * Dismisses the dialog on Escape key press.
     *
     * @param event - Document keydown event.
     */
    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [disableEscape, onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        aria-label={label}
        className={`${className} rounded-lg border border-separator bg-surface p-4 shadow-xl`}
        onClick={(event) => event.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}
