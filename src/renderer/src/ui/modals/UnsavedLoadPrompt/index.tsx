import { useCallback, type JSX } from 'react';
import { useAppDispatch, useAppSelector } from '#/renderer/src/store/hooks';
import { closeOverlay } from '#/renderer/src/store/slices/navigationSlice';
import {
  selectPendingLoadRequest,
  setPendingLoadRequest
} from '#/renderer/src/store/slices/modalsSlice';
import { loadRequest } from '#/renderer/src/store/slices/tabsSlice';
import { primaryButton, secondaryButton } from '#/renderer/src/ui/shared/classes';
import { Modal } from '#/renderer/src/ui/shared/Modal';

/**
 * Confirms opening a request when collection or environment settings have unsaved edits.
 */
export function UnsavedLoadPrompt(): JSX.Element | null {
  const dispatch = useAppDispatch();
  const pendingLoadRequest = useAppSelector(selectPendingLoadRequest);

  const handleCancel = useCallback((): void => {
    dispatch(setPendingLoadRequest(null));
  }, [dispatch]);

  const handleConfirm = useCallback((): void => {
    if (!pendingLoadRequest) return;
    dispatch(setPendingLoadRequest(null));
    dispatch(closeOverlay());
    dispatch(loadRequest(pendingLoadRequest));
  }, [dispatch, pendingLoadRequest]);

  if (!pendingLoadRequest) return null;

  return (
    <Modal onClose={handleCancel}>
      <h2 className="m-0 mb-1 text-[13px] font-semibold text-text">Unsaved changes</h2>
      <p className="mb-4 text-[12px] text-muted">
        Settings have unsaved changes. Open request without saving?
      </p>
      <div className="flex justify-end gap-2">
        <button className={secondaryButton} onClick={handleCancel}>
          Cancel
        </button>
        <button className={primaryButton} onClick={handleConfirm}>
          Open without saving
        </button>
      </div>
    </Modal>
  );
}
