import { useCallback, type JSX } from 'react';
import { useAppDispatch, useAppSelector } from '#/renderer/src/store/hooks';
import { selectQuitPrompt, setQuitPrompt } from '#/renderer/src/store/slices/modalsSlice';
import { primaryButton, secondaryButton } from '#/renderer/src/ui/shared/classes';
import { Modal } from '#/renderer/src/ui/shared/Modal';

/**
 * Confirms quitting when one or more request tabs have unsaved changes.
 */
export function QuitPrompt(): JSX.Element | null {
  const dispatch = useAppDispatch();
  const quitPrompt = useAppSelector(selectQuitPrompt);

  /**
   * Dismisses the quit prompt and tells main whether to proceed with app close.
   */
  const handleCancel = useCallback((): void => {
    dispatch(setQuitPrompt(null));
    window.api.confirmClose(false);
  }, [dispatch]);

  /**
   * Confirms quit without saving and tells main to close the app.
   */
  const handleConfirm = useCallback((): void => {
    dispatch(setQuitPrompt(null));
    window.api.confirmClose(true);
  }, [dispatch]);

  if (!quitPrompt) return null;

  return (
    <Modal onClose={handleCancel}>
      <h2 className="m-0 mb-1 text-[13px] font-semibold text-text">Unsaved changes</h2>
      <p className="mb-4 text-[12px] text-muted">
        {quitPrompt.length === 1 ? (
          <>&ldquo;{quitPrompt[0]}&rdquo; has unsaved changes. Quit without saving?</>
        ) : (
          <>{quitPrompt.length} requests have unsaved changes. Quit without saving?</>
        )}
      </p>
      <div className="flex justify-end gap-2">
        <button className={secondaryButton} onClick={handleCancel}>
          Cancel
        </button>
        <button className={primaryButton} onClick={handleConfirm}>
          Quit without saving
        </button>
      </div>
    </Modal>
  );
}
