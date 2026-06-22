import { useCallback, type JSX } from 'react';
import toast from 'react-hot-toast';
import { useAppDispatch, useAppSelector } from '#/renderer/src/store/hooks';
import {
  closeCollectionModal,
  selectCollectionModal,
  setCollectionModalInviteTokenInput,
  setCollectionModalName,
  setCollectionModalSubmitError,
  setCollectionModalTab
} from '#/renderer/src/store/slices/modalsSlice';
import {
  acceptInviteToken,
  createCollection,
  importCollection,
  saveRequest
} from '#/renderer/src/store/thunks';
import {
  SegmentedTabs,
  SegmentedTabPanel,
  SegmentedTabsGroup
} from '#/renderer/src/components/SegmentedTabs';
import { Button } from '#/renderer/src/components/Button';
import { field } from '#/renderer/src/ui/shared/classes';
import { Modal } from '#/renderer/src/ui/shared/Modal';
import { formatErrorMessage } from '#/renderer/src/ui/modals/dialogHelpers';

/**
 * Modal for creating a collection, importing from file, or accepting an invite.
 */
export function CollectionModal(): JSX.Element | null {
  const dispatch = useAppDispatch();
  const collectionModal = useAppSelector(selectCollectionModal);

  /**
   * Closes the collection modal and resets modal state.
   */
  const handleClose = useCallback((): void => {
    dispatch(closeCollectionModal());
  }, [dispatch]);

  /**
   * Creates a collection, optionally saving the current draft into it.
   */
  const handleSubmit = useCallback(async (): Promise<void> => {
    if (!collectionModal) return;
    const name = collectionModal.name.trim();
    if (!name) return;
    dispatch(setCollectionModalSubmitError(null));
    try {
      const collection = await dispatch(createCollection(name)).unwrap();
      if (collectionModal.mode === 'create-and-save') {
        await dispatch(saveRequest(collection.id)).unwrap();
        toast.success('Request saved');
      }
      dispatch(closeCollectionModal());
    } catch (err) {
      dispatch(
        setCollectionModalSubmitError(
          formatErrorMessage(
            err,
            collectionModal.mode === 'create-and-save'
              ? 'Failed to save request'
              : 'Failed to create collection'
          )
        )
      );
    }
  }, [collectionModal, dispatch]);

  /**
   * Imports a collection from a JSON file selected via a native dialog.
   */
  const handleImport = useCallback(async (): Promise<void> => {
    dispatch(setCollectionModalSubmitError(null));
    try {
      const collection = await dispatch(importCollection()).unwrap();
      if (!collection) return;
      toast.success('Collection imported');
      dispatch(closeCollectionModal());
    } catch (err) {
      dispatch(
        setCollectionModalSubmitError(formatErrorMessage(err, 'Failed to import collection'))
      );
    }
  }, [dispatch]);

  /**
   * Accepts an invite JWT and adds the embedded database connection.
   */
  const handleAcceptInvite = useCallback(async (): Promise<void> => {
    if (!collectionModal) return;
    const token = collectionModal.inviteTokenInput.trim();
    if (!token) return;
    dispatch(setCollectionModalSubmitError(null));
    try {
      await dispatch(acceptInviteToken(token)).unwrap();
    } catch (err) {
      dispatch(setCollectionModalSubmitError(formatErrorMessage(err, 'Failed to accept invite')));
    }
  }, [collectionModal, dispatch]);

  if (!collectionModal) return null;

  const showImportTab = collectionModal.mode === 'create';

  return (
    <Modal onClose={handleClose} className="w-[32rem]" labelledBy="collection-modal-title">
      <h2 id="collection-modal-title" className="m-0 mb-1 text-[14px] font-semibold text-text">
        {showImportTab ? 'Add collection' : 'New collection'}
      </h2>
      {collectionModal.mode === 'create-and-save' && (
        <p className="mb-3 text-[14px] text-muted">
          Create a collection to save this request into.
        </p>
      )}

      {showImportTab ? (
        <SegmentedTabsGroup
          value={collectionModal.tab}
          onChange={(tab) => dispatch(setCollectionModalTab(tab))}
          ariaLabel="Add collection options"
        >
          <SegmentedTabs
            fullWidth
            className="mb-3"
            tabs={[
              { value: 'create', label: 'Create new' },
              { value: 'import', label: 'Import from file' },
              { value: 'invite', label: 'Accept invite' }
            ]}
          />

          {collectionModal.submitError && (
            <p className="mb-3 text-[14px] text-danger">{collectionModal.submitError}</p>
          )}

          <SegmentedTabPanel value="invite">
            <p className="mb-3 text-[14px] text-muted">
              Paste an invite token from a trusted sender. Add their public key under File →
              Certificates first. Restart HarborClient after accepting to load collections from that
              database.
            </p>
            <textarea
              className={`${field} min-h-28 w-full resize-y font-mono text-[14px]`}
              autoFocus
              placeholder="Paste invite token"
              value={collectionModal.inviteTokenInput}
              onChange={(e) => dispatch(setCollectionModalInviteTokenInput(e.target.value))}
            />
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="secondary" onClick={handleClose}>
                Cancel
              </Button>
              <Button
                onClick={() => void handleAcceptInvite()}
                disabled={!collectionModal.inviteTokenInput.trim()}
              >
                Accept
              </Button>
            </div>
          </SegmentedTabPanel>

          <SegmentedTabPanel value="create">
            <input
              className={`${field} w-full`}
              type="text"
              autoFocus
              placeholder="Collection name"
              value={collectionModal.name}
              onChange={(e) => dispatch(setCollectionModalName(e.target.value))}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void handleSubmit();
              }}
            />
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="secondary" onClick={handleClose}>
                Cancel
              </Button>
              <Button onClick={() => void handleSubmit()} disabled={!collectionModal.name.trim()}>
                {collectionModal.mode === 'create-and-save' ? 'Create & Save' : 'Create'}
              </Button>
            </div>
          </SegmentedTabPanel>

          <SegmentedTabPanel value="import">
            <p className="mb-4 text-[14px] text-muted">
              Choose a HarborClient or Postman collection export (.json) to import all saved
              requests.
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={handleClose}>
                Cancel
              </Button>
              <Button onClick={() => void handleImport()}>Import .json</Button>
            </div>
          </SegmentedTabPanel>
        </SegmentedTabsGroup>
      ) : (
        <>
          {collectionModal.submitError && (
            <p className="mb-3 text-[14px] text-danger">{collectionModal.submitError}</p>
          )}
          <input
            className={`${field} w-full`}
            type="text"
            autoFocus
            placeholder="Collection name"
            value={collectionModal.name}
            onChange={(e) => dispatch(setCollectionModalName(e.target.value))}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void handleSubmit();
            }}
          />
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="secondary" onClick={handleClose}>
              Cancel
            </Button>
            <Button onClick={() => void handleSubmit()} disabled={!collectionModal.name.trim()}>
              {collectionModal.mode === 'create-and-save' ? 'Create & Save' : 'Create'}
            </Button>
          </div>
        </>
      )}
    </Modal>
  );
}
