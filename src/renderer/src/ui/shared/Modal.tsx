import type { JSX, ReactNode } from 'react';

interface Props {
  /** Called when the backdrop is clicked or Escape is pressed. */
  onClose: () => void;

  /** Optional width class for the dialog panel (defaults to w-96). */
  className?: string;

  children: ReactNode;
}

/**
 * Shared modal backdrop and panel wrapper used by all application dialogs.
 */
export function Modal({ onClose, className = 'w-96', children }: Props): JSX.Element {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        className={`${className} rounded-lg border border-separator bg-surface p-4 shadow-xl`}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}
