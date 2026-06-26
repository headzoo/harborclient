import { useMemo, useState, type JSX } from 'react';
import toast from 'react-hot-toast';
import type {
  AdminResourceOption,
  TeamHub,
  TeamHubAdminFolderSummary,
  TeamHubAdminRequestSummary
} from '#/shared/types';
import { Button } from '#/renderer/src/components/Button';
import { Modal } from '#/renderer/src/components/Modal';
import { FaIcon } from '#/renderer/src/components/FaIcon';
import { faAngleLeft } from '#/renderer/src/fontawesome';
import { useTeamHubAdminCollectionContents } from '#/renderer/src/hooks/useTeamHubAdminCollectionContents';
import { METHOD_CLASSES } from '#/renderer/src/ui/shared/classes';

interface Props {
  /**
   * Admin team hub connection whose collection is being inspected.
   */
  hub: TeamHub;

  /**
   * Collection whose folders and requests are listed.
   */
  collection: AdminResourceOption;

  /**
   * Returns to the collection list view.
   */
  onBack: () => void;
}

/**
 * One folder section with its saved requests for the admin collection contents view.
 */
interface RequestSection {
  /**
   * Section heading shown above the request rows.
   */
  title: string;

  /**
   * Requests sorted for display within the section.
   */
  requests: TeamHubAdminRequestSummary[];
}

/**
 * Sorts folders by sort order, then name.
 *
 * @param folders - Folder summaries to order for display.
 * @returns Folders in sidebar order.
 */
function sortFolders(folders: TeamHubAdminFolderSummary[]): TeamHubAdminFolderSummary[] {
  return [...folders].sort((left, right) => {
    if (left.sortOrder !== right.sortOrder) {
      return left.sortOrder - right.sortOrder;
    }

    return left.name.localeCompare(right.name);
  });
}

/**
 * Sorts requests by sort order, then name.
 *
 * @param requests - Request summaries to order for display.
 * @returns Requests in sidebar order.
 */
function sortRequests(requests: TeamHubAdminRequestSummary[]): TeamHubAdminRequestSummary[] {
  return [...requests].sort((left, right) => {
    if (left.sortOrder !== right.sortOrder) {
      return left.sortOrder - right.sortOrder;
    }

    return left.name.localeCompare(right.name);
  });
}

/**
 * Groups saved requests under folder headings plus an unfiled root section.
 *
 * @param folders - Folder summaries in the collection.
 * @param requests - Request summaries in the collection.
 * @returns Ordered sections for rendering the request list.
 */
function buildRequestSections(
  folders: TeamHubAdminFolderSummary[],
  requests: TeamHubAdminRequestSummary[]
): RequestSection[] {
  const sections: RequestSection[] = [];
  const rootRequests = sortRequests(requests.filter((request) => request.folderId === null));

  if (rootRequests.length > 0) {
    sections.push({ title: 'Unfiled', requests: rootRequests });
  }

  for (const folder of sortFolders(folders)) {
    const folderRequests = sortRequests(
      requests.filter((request) => request.folderId === folder.id)
    );

    if (folderRequests.length > 0) {
      sections.push({ title: folder.name, requests: folderRequests });
    }
  }

  return sections;
}

/**
 * Team Hub collection contents view listing saved requests for operator inspection.
 */
export function TeamCollectionContentsView({ hub, collection, onBack }: Props): JSX.Element {
  const { folders, requests, loading, error, reload } = useTeamHubAdminCollectionContents(
    hub.id,
    collection.id
  );
  const [deletingRequest, setDeletingRequest] = useState<TeamHubAdminRequestSummary | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  /**
   * Derives folder-grouped request sections for the current collection contents.
   */
  const sections = useMemo(() => buildRequestSections(folders, requests), [folders, requests]);

  /**
   * Closes the delete confirmation modal.
   */
  const closeDeleteModal = (): void => {
    if (deleting) {
      return;
    }

    setDeletingRequest(null);
    setActionError(null);
  };

  /**
   * Opens the delete confirmation modal for a request row.
   *
   * @param request - Saved request to delete.
   */
  const handleDeleteClick = (request: TeamHubAdminRequestSummary): void => {
    setActionError(null);
    setDeletingRequest(request);
  };

  /**
   * Permanently deletes the selected request on the hub after confirmation.
   */
  const handleConfirmDelete = async (): Promise<void> => {
    if (!deletingRequest) {
      return;
    }

    setDeleting(true);
    setActionError(null);

    try {
      await window.api.deleteTeamHubRequest(hub.id, deletingRequest.id);
      setDeletingRequest(null);
      reload();
      toast.success('Request deleted.');
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : String(err));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h2 className="m-0 mb-1 text-[14px] font-medium text-text">{collection.name}</h2>
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
      ) : sections.length === 0 ? (
        <p className="text-[14px] text-muted">No requests found.</p>
      ) : (
        <div className="flex flex-col gap-4">
          {sections.map((section) => (
            <section key={section.title}>
              <h3 className="m-0 mb-2 text-[14px] font-medium text-text">{section.title}</h3>
              <ul className="m-0 flex list-none flex-col gap-2 p-0">
                {section.requests.map((request) => (
                  <li
                    key={request.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-separator px-3 py-2"
                  >
                    <div className="flex min-w-0 items-start gap-2">
                      <span
                        className={`shrink-0 px-1 py-px text-[14px] font-medium ${METHOD_CLASSES[request.method.toLowerCase()] ?? 'text-info'}`}
                      >
                        {request.method}
                      </span>
                      <div className="min-w-0">
                        <span className="block truncate text-[14px] font-medium text-text">
                          {request.name}
                        </span>
                        <span className="block truncate text-[14px] text-muted">{request.url}</span>
                        <span className="block truncate text-[14px] text-muted">{request.id}</span>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="secondaryDanger"
                      onClick={() => handleDeleteClick(request)}
                    >
                      Delete
                    </Button>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}

      {deletingRequest && (
        <Modal onClose={closeDeleteModal} labelledBy="delete-request-title">
          <h2 id="delete-request-title" className="m-0 mb-1 text-[14px] font-semibold text-text">
            Delete request?
          </h2>
          <p className="mb-4 text-[14px] text-muted">
            Permanently delete &ldquo;{deletingRequest.name}&rdquo; from the team hub? Team members
            will lose access to this saved request on the server.
          </p>

          {actionError && <p className="mb-4 text-[14px] text-danger">{actionError}</p>}

          <div className="flex justify-end gap-2">
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
              disabled={deleting}
              onClick={() => void handleConfirmDelete()}
            >
              {deleting ? 'Deleting…' : 'Delete'}
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
}
