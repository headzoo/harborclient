import { useCallback, type JSX } from 'react';
import toast from 'react-hot-toast';
import { useAppDispatch, useAppSelector } from '#/renderer/src/store/hooks';
import {
  closeInviteModal,
  selectInviteModal,
  setInviteRecipientKid
} from '#/renderer/src/store/slices/modalsSlice';
import { generateInviteToken } from '#/renderer/src/store/thunks';
import { Button } from '#/renderer/src/components/Button';
import { field } from '#/renderer/src/ui/shared/classes';
import { Modal } from '#/renderer/src/ui/shared/Modal';

/**
 * Modal for generating and copying an encrypted collection invite token.
 */
export function InviteModal(): JSX.Element | null {
  const dispatch = useAppDispatch();
  const invite = useAppSelector(selectInviteModal);

  /**
   * Closes the invite modal and clears generated token state.
   */
  const handleClose = useCallback((): void => {
    dispatch(closeInviteModal());
  }, [dispatch]);

  if (!invite) return null;

  return (
    <Modal onClose={handleClose} className="w-[32rem]" labelledBy="invite-modal-title">
      <h2 id="invite-modal-title" className="m-0 mb-1 text-[14px] font-semibold text-text">
        Invite to collection
      </h2>
      <p className="mb-3 text-[14px] text-muted">
        Create an encrypted invite for &ldquo;{invite.collectionName}&rdquo;. Only the selected
        recipient can decrypt it. Invites expire after seven days.
      </p>
      {invite.trustedKeysLoading ? (
        <p className="text-[14px] text-muted">Loading trusted keys…</p>
      ) : invite.trustedKeys.length === 0 ? (
        <p className="text-[14px] text-muted">
          Add the recipient&apos;s public key under File → Certificates → Trusted keys before
          creating an invite.
        </p>
      ) : (
        <>
          <label className="mb-1 block text-[14px] font-medium text-text">Recipient</label>
          <select
            className={`${field} mb-3 w-full`}
            value={invite.recipientKid}
            disabled={invite.tokenLoading}
            onChange={(event) => dispatch(setInviteRecipientKid(event.target.value))}
          >
            <option value="">Select a recipient…</option>
            {invite.trustedKeys.map((key) => (
              <option key={key.id} value={key.id}>
                {key.label}
              </option>
            ))}
          </select>
        </>
      )}
      {invite.tokenError && <p className="mb-3 text-[14px] text-danger">{invite.tokenError}</p>}
      {invite.tokenLoading ? (
        <p className="text-[14px] text-muted">Generating invite token…</p>
      ) : invite.token ? (
        <textarea
          className={`${field} min-h-28 w-full resize-y font-mono text-[14px]`}
          readOnly
          value={invite.token}
          onFocus={(e) => e.target.select()}
        />
      ) : null}
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="secondary" onClick={handleClose}>
          Close
        </Button>
        {!invite.token && invite.trustedKeys.length > 0 && (
          <Button
            disabled={!invite.recipientKid || invite.tokenLoading || invite.trustedKeysLoading}
            onClick={() => void dispatch(generateInviteToken())}
          >
            Generate invite
          </Button>
        )}
        {invite.token && (
          <Button
            disabled={invite.tokenLoading}
            onClick={() => {
              void navigator.clipboard.writeText(invite.token).then(
                () => toast.success('Invite token copied'),
                () => toast.error('Failed to copy invite token')
              );
            }}
          >
            Copy
          </Button>
        )}
      </div>
    </Modal>
  );
}
