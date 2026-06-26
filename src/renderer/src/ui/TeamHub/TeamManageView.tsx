import { useState, type JSX } from 'react';
import toast from 'react-hot-toast';
import type {
  CreateHubUserInput,
  HubUserRecord,
  TeamHub,
  TeamHubAdminResourceOptions,
  UpdateHubUserInput
} from '#/shared/types';
import { Input } from '#/renderer/src/components/forms';
import { Button } from '#/renderer/src/components/Button';
import { PageHeader } from '#/renderer/src/components/PageHeader';
import { FaIcon } from '#/renderer/src/components/FaIcon';
import { faAngleLeft } from '#/renderer/src/fontawesome';
import { useTeamHubUsers } from '#/renderer/src/hooks/useTeamHubUsers';
import { useAppDispatch } from '#/renderer/src/store/hooks';
import { refreshCollections } from '#/renderer/src/store/thunks/collections';
import { TeamSecretDialog } from '#/renderer/src/ui/TeamHub/TeamSecretDialog';
import { TeamUserForm } from '#/renderer/src/ui/TeamHub/TeamUserForm';

const editFormId = 'team-user-edit-form';
const createFormId = 'team-user-create-form';

interface Props {
  /**
   * Admin team hub connection whose users are being managed.
   */
  hub: TeamHub;

  /**
   * Returns to the team hub list view.
   */
  onBack: () => void;
}

/**
 * Team Hub user administration view for operator tokens.
 */
export function TeamManageView({ hub, onBack }: Props): JSX.Element {
  const dispatch = useAppDispatch();
  const { users, loading, error, reload } = useTeamHubUsers(hub.id);
  const [editingUser, setEditingUser] = useState<HubUserRecord | null>(null);
  const [creatingUser, setCreatingUser] = useState(false);
  const [createdSecret, setCreatedSecret] = useState<string | null>(null);
  const [deletingUser, setDeletingUser] = useState<HubUserRecord | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [resourceOptions, setResourceOptions] = useState<TeamHubAdminResourceOptions | null>(null);
  const [optionsLoading, setOptionsLoading] = useState(false);

  /**
   * Loads autocomplete options for the selected hub.
   */
  const loadResourceOptions = (): void => {
    setResourceOptions(null);
    setOptionsLoading(true);

    void window.api
      .listTeamHubAdminResourceOptions(hub.id)
      .then((options) => {
        setResourceOptions(options);
      })
      .catch((error: unknown) => {
        setResourceOptions({ collections: [], environments: [], models: [] });
        const message = error instanceof Error ? error.message : 'Failed to load resource options.';
        setActionError(message);
      })
      .finally(() => {
        setOptionsLoading(false);
      });
  };

  /**
   * Closes the create modal and clears action errors.
   */
  const closeCreateModal = (): void => {
    if (saving) {
      return;
    }

    setCreatingUser(false);
    setResourceOptions(null);
    setOptionsLoading(false);
    setActionError(null);
  };

  /**
   * Opens the create user modal and loads resource options.
   */
  const handleCreateClick = (): void => {
    setActionError(null);
    setCreatingUser(true);
    loadResourceOptions();
  };

  /**
   * Closes the edit modal and clears action errors.
   */
  const closeEditModal = (): void => {
    if (saving) {
      return;
    }

    setEditingUser(null);
    setResourceOptions(null);
    setOptionsLoading(false);
    setActionError(null);
  };

  /**
   * Opens the edit modal for a user row.
   *
   * @param user - User account to edit.
   */
  const handleEdit = (user: HubUserRecord): void => {
    setActionError(null);
    setEditingUser(user);
    loadResourceOptions();
  };

  /**
   * Opens the delete confirmation modal for a user row.
   *
   * @param user - User account to delete.
   */
  const handleDeleteClick = (user: HubUserRecord): void => {
    setActionError(null);
    setDeleteConfirmText('');
    setDeletingUser(user);
  };

  /**
   * Closes the delete confirmation modal.
   */
  const closeDeleteModal = (): void => {
    if (deleting) {
      return;
    }

    setDeletingUser(null);
    setDeleteConfirmText('');
    setActionError(null);
  };

  /**
   * Persists user edits through the management API.
   *
   * @param input - Partial user fields to apply.
   */
  const handleSaveUser = async (input: UpdateHubUserInput): Promise<void> => {
    if (!editingUser) {
      return;
    }

    setSaving(true);
    setActionError(null);

    try {
      await window.api.updateTeamHubUser(hub.id, editingUser.id, input);
      setEditingUser(null);
      reload();
      await dispatch(refreshCollections());
      toast.success('User updated.');
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  };

  /**
   * Creates a user account and shows the one-time token secret.
   *
   * @param input - User fields for the new account.
   */
  const handleCreateUser = async (input: CreateHubUserInput): Promise<void> => {
    setSaving(true);
    setActionError(null);

    try {
      const created = await window.api.createTeamHubUser(hub.id, input);
      setCreatingUser(false);
      setCreatedSecret(created.secret);
      reload();
      await dispatch(refreshCollections());
      toast.success('User created.');
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  };

  /**
   * Deletes the selected user after the operator confirms by typing DELETE.
   */
  const handleConfirmDelete = async (): Promise<void> => {
    if (!deletingUser || deleteConfirmText !== 'DELETE') {
      return;
    }

    setDeleting(true);
    setActionError(null);

    try {
      await window.api.deleteTeamHubUser(hub.id, deletingUser.id);
      setDeletingUser(null);
      setDeleteConfirmText('');
      reload();
      toast.success('User deleted.');
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : String(err));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div>
      <PageHeader title="Users" description={`${hub.name || 'Untitled'} · ${hub.baseUrl}`}>
        <Button type="button" className="shrink-0 whitespace-nowrap" onClick={handleCreateClick}>
          Create user
        </Button>
        <Button
          type="button"
          className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap"
          onClick={onBack}
        >
          <FaIcon icon={faAngleLeft} className="h-3.5 w-3.5" aria-hidden />
          Back
        </Button>
      </PageHeader>

      {loading ? (
        <p className="text-[14px] text-muted">Loading…</p>
      ) : error ? (
        <div className="flex flex-wrap items-center gap-2">
          <p className="mb-0 text-[14px] text-danger">{error}</p>
          <Button type="button" variant="secondary" onClick={reload}>
            Retry
          </Button>
        </div>
      ) : users.length === 0 ? (
        <p className="text-[14px] text-muted">No users found.</p>
      ) : (
        <ul className="m-0 flex list-none flex-col gap-2 p-0">
          {users.map((user) => (
            <li
              key={user.id}
              className="flex items-center justify-between gap-3 rounded-md border border-separator px-3 py-2"
            >
              <div className="min-w-0">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="truncate text-[14px] font-medium text-text">
                    {user.name || 'Untitled'}
                  </span>
                  <span className="rounded bg-success/15 px-1.5 py-0.5 text-[14px] font-medium text-success">
                    {user.role}
                  </span>
                </div>
                <span className="truncate text-[14px] text-muted">{user.id}</span>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                <Button type="button" variant="secondary" onClick={() => handleEdit(user)}>
                  Edit
                </Button>
                <Button type="button" variant="secondary" onClick={() => handleDeleteClick(user)}>
                  Delete
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {editingUser && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={closeEditModal}
        >
          <div
            className="max-h-[85vh] w-[520px] overflow-y-auto rounded-lg border border-separator bg-surface p-4 shadow-xl"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="team-user-dialog-title"
          >
            <h2
              id="team-user-dialog-title"
              className="m-0 mb-1 text-[14px] font-semibold text-text"
            >
              Edit user
            </h2>
            <p className="mb-4 text-[14px] text-muted">
              Update account settings for &ldquo;{editingUser.name || 'Untitled'}&rdquo;.
            </p>

            <TeamUserForm
              key={editingUser.id}
              mode="edit"
              user={editingUser}
              disabled={saving}
              resourceOptions={resourceOptions}
              optionsLoading={optionsLoading}
              formId={editFormId}
              onSubmit={handleSaveUser}
            />

            {actionError && <p className="mt-4 text-[14px] text-danger">{actionError}</p>}

            <div className="mt-4 flex justify-end gap-2">
              <Button type="button" variant="secondary" disabled={saving} onClick={closeEditModal}>
                Cancel
              </Button>
              <Button type="submit" form={editFormId} disabled={saving}>
                {saving ? 'Saving…' : 'Save'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {creatingUser && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={closeCreateModal}
        >
          <div
            className="max-h-[85vh] w-[520px] overflow-y-auto rounded-lg border border-separator bg-surface p-4 shadow-xl"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="team-user-create-title"
          >
            <h2
              id="team-user-create-title"
              className="m-0 mb-1 text-[14px] font-semibold text-text"
            >
              Create user
            </h2>
            <p className="mb-4 text-[14px] text-muted">
              A new API token will be generated automatically. Store the secret when it is shown; it
              will not be displayed again.
            </p>

            <TeamUserForm
              key="create-user"
              mode="create"
              disabled={saving}
              resourceOptions={resourceOptions}
              optionsLoading={optionsLoading}
              formId={createFormId}
              onSubmit={handleCreateUser}
            />

            {actionError && <p className="mt-4 text-[14px] text-danger">{actionError}</p>}

            <div className="mt-4 flex justify-end gap-2">
              <Button
                type="button"
                variant="secondary"
                disabled={saving}
                onClick={closeCreateModal}
              >
                Cancel
              </Button>
              <Button type="submit" form={createFormId} disabled={saving}>
                {saving ? 'Creating…' : 'Create'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {createdSecret && (
        <TeamSecretDialog
          title="User created"
          description="Copy this API token secret now. It will not be shown again."
          secret={createdSecret}
          onClose={() => setCreatedSecret(null)}
        />
      )}

      {deletingUser && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={closeDeleteModal}
        >
          <div
            className="w-[480px] rounded-lg border border-separator bg-surface p-4 shadow-xl"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="team-user-delete-title"
          >
            <h2
              id="team-user-delete-title"
              className="m-0 mb-1 text-[14px] font-semibold text-text"
            >
              Delete user?
            </h2>
            <p className="mb-4 text-[14px] text-muted">
              This permanently deletes &ldquo;{deletingUser.name || 'Untitled'}&rdquo; and revokes
              all of their API tokens. Type <strong>DELETE</strong> to confirm.
            </p>

            <label
              htmlFor="team-user-delete-confirm"
              className="mb-1 block text-[14px] font-medium text-text"
            >
              Confirmation
            </label>
            <Input
              id="team-user-delete-confirm"
              type="text"
              variant="surface"
              value={deleteConfirmText}
              disabled={deleting}
              autoComplete="off"
              onChange={(event) => setDeleteConfirmText(event.target.value)}
            />

            {actionError && <p className="mt-4 text-[14px] text-danger">{actionError}</p>}

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
