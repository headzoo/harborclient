import { describe, expect, it, vi } from 'vitest';
import { setAlertModal, setConfirmModal } from '#/renderer/src/store/slices/modalsSlice';
import {
  formatErrorMessage,
  resolveConfirm,
  showAlert,
  showConfirm
} from '#/renderer/src/ui/modals/dialogHelpers';

describe('dialogHelpers', () => {
  it('formatErrorMessage returns Error.message or fallback', () => {
    expect(formatErrorMessage(new Error('boom'), 'fallback')).toBe('boom');
    expect(formatErrorMessage('nope', 'fallback')).toBe('fallback');
  });

  it('showAlert dispatches alert modal state', () => {
    const dispatch = vi.fn();
    showAlert(dispatch, 'Failed to save', 'Error');
    expect(dispatch).toHaveBeenCalledWith({
      type: setAlertModal.type,
      payload: { title: 'Error', message: 'Failed to save' }
    });
  });

  it('showConfirm resolves true when confirmed and false when cancelled', async () => {
    const dispatch = vi.fn();
    const pending = showConfirm(dispatch, {
      title: 'Delete',
      message: 'Delete this item?',
      confirmLabel: 'Delete',
      variant: 'danger'
    });

    expect(dispatch).toHaveBeenCalledWith({
      type: setConfirmModal.type,
      payload: {
        title: 'Delete',
        message: 'Delete this item?',
        confirmLabel: 'Delete',
        cancelLabel: 'Cancel',
        variant: 'danger'
      }
    });

    resolveConfirm(dispatch, true);
    await expect(pending).resolves.toBe(true);
    expect(dispatch).toHaveBeenCalledWith({ type: setConfirmModal.type, payload: null });

    const cancelled = showConfirm(dispatch, { title: 'Delete', message: 'Again?' });
    resolveConfirm(dispatch, false);
    await expect(cancelled).resolves.toBe(false);
  });
});
