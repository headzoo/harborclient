import { useCallback } from 'react';
import { useAppDispatch } from '#/renderer/src/store/hooks';
import { showConfirm, type ConfirmOptions } from '#/renderer/src/ui/modals/dialogHelpers';

/**
 * Returns a function that opens a custom confirmation modal and resolves with the user's choice.
 */
export function useConfirm(): (options: ConfirmOptions) => Promise<boolean> {
  const dispatch = useAppDispatch();

  /**
   * Opens a confirmation modal via Redux and returns whether the user confirmed.
   */
  return useCallback((options: ConfirmOptions) => showConfirm(dispatch, options), [dispatch]);
}
