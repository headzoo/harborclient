import { useCallback, type JSX } from 'react';
import { useAppDispatch, useAppSelector } from '#/renderer/src/store/hooks';
import { selectConfirmModal } from '#/renderer/src/store/slices/modalsSlice';
import { primaryButton, secondaryButton } from '#/renderer/src/ui/shared/classes';
import { Modal } from '#/renderer/src/ui/shared/Modal';
import { resolveConfirm } from '#/renderer/src/ui/modals/dialogHelpers';

/**
 * Confirmation dialog with cancel and confirm actions for destructive or irreversible operations.
 */
export function ConfirmModal(): JSX.Element | null {
  const dispatch = useAppDispatch();
  const confirmModal = useAppSelector(selectConfirmModal);

  /**
   * Dismisses the dialog without confirming the pending action.
   */
  const handleCancel = useCallback((): void => {
    resolveConfirm(dispatch, false);
  }, [dispatch]);

  /**
   * Confirms the pending action and resolves the showConfirm promise.
   */
  const handleConfirm = useCallback((): void => {
    resolveConfirm(dispatch, true);
  }, [dispatch]);

  if (!confirmModal) return null;

  const confirmButtonClass =
    confirmModal.variant === 'danger'
      ? 'cursor-pointer rounded-md border border-transparent bg-danger px-3 py-1 text-[15px] font-medium text-white shadow-sm hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50 app-no-drag'
      : primaryButton;

  return (
    <Modal onClose={handleCancel}>
      <h2 className="m-0 mb-1 text-[13px] font-semibold text-text">{confirmModal.title}</h2>
      <p className="mb-4 text-[12px] text-muted">{confirmModal.message}</p>
      <div className="flex justify-end gap-2">
        <button className={secondaryButton} onClick={handleCancel}>
          {confirmModal.cancelLabel}
        </button>
        <button className={confirmButtonClass} onClick={handleConfirm}>
          {confirmModal.confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
