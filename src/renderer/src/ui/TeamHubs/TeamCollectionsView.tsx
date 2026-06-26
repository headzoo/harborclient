import { useState, type JSX } from 'react';
import toast from 'react-hot-toast';
import type { AdminResourceOption, TeamHub } from '#/shared/types';
import { Input } from '#/renderer/src/components/forms';
import { Button } from '#/renderer/src/components/Button';
import { FaIcon } from '#/renderer/src/components/FaIcon';
import { faAngleLeft, faChevronRight } from '#/renderer/src/fontawesome';
import { useTeamHubAdminCollections } from '#/renderer/src/hooks/useTeamHubAdminCollections';
import { TeamCollectionContentsView } from '#/renderer/src/ui/TeamHubs/TeamCollectionContentsView';

interface Props {
  /**
   * Admin team hub connection whose collections are being managed.
   */
  hub: TeamHub;

  /**
   * Returns to the team hub list view.
   */
  onBack: () => void;
}

/**
 * Team Hub collection administration view for operator tokens.
 */
export function TeamCollectionsView({ hub, onBack }: Props): JSX.Element {
  const { collections, loading, error, reload } = useTeamHubAdminCollections(hub.id);
  const [selectedCollection, setSelectedCollection] = useState<AdminResourceOption | null>(null);
  const [deletingCollection, setDeletingCollection] = useState<AdminResourceOption | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [lockingId, setLockingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  /**
   * Opens the delete confirmation modal for a collection row.
   *
   * @param collection - Collection record to delete.
   */
  const handleDeleteClick = (collection: AdminResourceOption): void => {
    setActionError(null);
    setDeleteConfirmText('');
    setDeletingCollection(collection);
  };

  /**
   * Closes the delete confirmation modal.
   */
  const closeDeleteModal = (): void => {
    if (deleting) {
      return;
    }

    setDeletingCollection(null);
    setDeleteConfirmText('');
    setActionError(null);
  };

  /**
   * Permanently deletes the selected collection on the hub after confirmation.
   */
  const handleConfirmDelete = async (): Promise<void> => {
    if (!deletingCollection || deleteConfirmText !== 'DELETE') {
      return;
    }

    setDeleting(true);
    setActionError(null);

    try {
      await window.api.deleteTeamHubCollection(hub.id, deletingCollection.id);
      setDeletingCollection(null);
      setDeleteConfirmText('');
      reload();
      toast.success('Collection deleted.');
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : String(err));
    } finally {
      setDeleting(false);
    }
  };

  /**
   * Updates whether non-admin users may delete a collection on the hub.
   *
   * @param collection - Collection row being updated.
   * @param deletionLocked - New lock flag from the checkbox.
   */
  const handleDeletionLockedChange = async (
    collection: AdminResourceOption,
    deletionLocked: boolean
  ): Promise<void> => {
    setActionError(null);
    setLockingId(collection.id);

    try {
      await window.api.updateTeamHubCollectionDeletionLocked(hub.id, collection.id, deletionLocked);
      toast.success(
        deletionLocked ? 'Collection protected from user deletion.' : 'Protection removed.'
      );
      reload();
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : String(err));
    } finally {
      setLockingId(null);
    }
  };

  if (selectedCollection) {
    return (
      <TeamCollectionContentsView
        hub={hub}
        collection={selectedCollection}
        onBack={() => setSelectedCollection(null)}
      />
    );
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h2 className="m-0 mb-1 text-[14px] font-medium text-text">Collections</h2>
          <p className="m-0 truncate text-[14px] text-muted">
            {hub.name || 'Untitled'} · {hub.baseUrl}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button
            type="button"
            variant="secondary"
            className="inline-flex items-center gap-1.5"
            onClick={onBack}
          >
            <FaIcon icon={faAngleLeft} className="h-3.5 w-3.5" aria-hidden />
            Back
          </Button>
        </div>
      </div>

      {loading ? (
        <p className="text-[14px] text-muted">Loading…</p>
      ) : error ? (
        <div className="flex flex-wrap items-center gap-2">
          <p className="mb-0 text-[14px] text-danger">{error}</p>
          <Button type="button" variant="secondary" onClick={reload}>
            Retry
          </Button>
        </div>
      ) : collections.length === 0 ? (
        <p className="text-[14px] text-muted">No collections found.</p>
      ) : (
        <ul className="m-0 flex list-none flex-col gap-2 p-0">
          {collections.map((collection) => (
            <li
              key={collection.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-separator px-3 py-2"
            >
              <button
                type="button"
                className="flex min-w-0 flex-1 items-center gap-2 rounded-md border-0 bg-transparent p-0 text-left hover:text-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                onClick={() => setSelectedCollection(collection)}
              >
                <div className="min-w-0">
                  <span className="block truncate text-[14px] font-medium text-text">
                    {collection.name}
                  </span>
                  <span className="block truncate text-[14px] text-muted">{collection.id}</span>
                </div>
                <FaIcon
                  icon={faChevronRight}
                  className="h-3.5 w-3.5 shrink-0 text-muted"
                  aria-hidden
                />
              </button>

              <div className="flex shrink-0 flex-wrap items-center gap-3">
                <label
                  className="flex cursor-pointer items-center gap-2 text-[14px] text-text"
                  onClick={(event) => event.stopPropagation()}
                >
                  <input
                    type="checkbox"
                    className="h-4 w-4 shrink-0"
                    checked={collection.deletionLocked}
                    disabled={lockingId === collection.id}
                    onChange={(event) =>
                      void handleDeletionLockedChange(collection, event.target.checked)
                    }
                  />
                  Protect from user deletion
                </label>
                <Button
                  type="button"
                  variant="secondaryDanger"
                  onClick={(event) => {
                    event.stopPropagation();
                    handleDeleteClick(collection);
                  }}
                >
                  Delete
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {actionError && !deletingCollection && (
        <p className="mt-3 text-[14px] text-danger">{actionError}</p>
      )}

      {deletingCollection && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={closeDeleteModal}
        >
          <div
            className="w-96 rounded-lg border border-separator bg-surface p-4 shadow-xl"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-collection-title"
          >
            <h2
              id="delete-collection-title"
              className="m-0 mb-1 text-[14px] font-semibold text-text"
            >
              Delete collection?
            </h2>
            <p className="mb-4 text-[14px] text-muted">
              Permanently delete &ldquo;{deletingCollection.name}&rdquo; from the team hub? Team
              members will lose access to this collection on the server.
            </p>

            <label className="mb-4 block text-[14px] text-text" htmlFor="delete-collection-confirm">
              Type DELETE to confirm
            </label>
            <Input
              id="delete-collection-confirm"
              value={deleteConfirmText}
              disabled={deleting}
              onChange={(event) => setDeleteConfirmText(event.target.value)}
              autoComplete="off"
            />

            {actionError && <p className="mt-3 text-[14px] text-danger">{actionError}</p>}

            <div className="mt-4 flex justify-end gap-2">
              <Button
                type="button"
                variant="secondary"
                disabled={deleting}
                onClick={closeDeleteModal}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="secondaryDanger"
                disabled={deleting || deleteConfirmText !== 'DELETE'}
                onClick={() => void handleConfirmDelete()}
              >
                {deleting ? 'Deleting…' : 'Delete'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
