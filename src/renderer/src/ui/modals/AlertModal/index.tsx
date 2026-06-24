import { useCallback, type JSX } from 'react';
import { useAppDispatch, useAppSelector } from '#/renderer/src/store/hooks';
import { selectAlertModal, setAlertModal } from '#/renderer/src/store/slices/modalsSlice';
import { Button } from '#/renderer/src/components/Button';
import { Modal } from '#/renderer/src/components/Modal';

/**
 * Blocking alert dialog with a single OK button for errors and messages.
 */
export function AlertModal(): JSX.Element | null {
  const dispatch = useAppDispatch();
  const alertModal = useAppSelector(selectAlertModal);

  /**
   * Dismisses the alert dialog.
   */
  const handleClose = useCallback((): void => {
    dispatch(setAlertModal(null));
  }, [dispatch]);

  if (!alertModal) return null;

  return (
    <Modal onClose={handleClose} labelledBy="alert-modal-title">
      <h2 id="alert-modal-title" className="m-0 mb-1 text-[14px] font-semibold text-text">
        {alertModal.title}
      </h2>
      <p className="mb-4 text-[14px] text-muted">{alertModal.message}</p>
      <div className="flex justify-end gap-2">
        <Button onClick={handleClose}>OK</Button>
      </div>
    </Modal>
  );
}
