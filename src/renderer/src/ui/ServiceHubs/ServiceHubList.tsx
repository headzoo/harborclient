import { useEffect, useState, type JSX } from 'react';
import type { ServiceHub } from '#/shared/types';
import { Button } from '#/renderer/src/components/Button';
import { useServiceHubs } from '#/renderer/src/hooks/useServiceHubs';
import { createBlankServiceHub, validateServiceHubForm } from './constants';
import { ServiceHubForm } from './ServiceHubForm';

/**
 * Lists configured service hubs with add, edit, and delete actions.
 */
export function ServiceHubList(): JSX.Element {
  const { serviceHubs, loading, error: bootstrapError, reload } = useServiceHubs();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [editingHub, setEditingHub] = useState<ServiceHub | null>(null);
  const [deletingHub, setDeletingHub] = useState<ServiceHub | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  /**
   * Closes edit or delete modals when Escape is pressed.
   */
  useEffect(() => {
    if (!editingHub && !deletingHub) return;

    /**
     * Dismisses the active modal on Escape.
     *
     * @param event - Window keydown event.
     */
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key !== 'Escape') return;
      if (deletingHub) {
        setDeletingHub(null);
      } else {
        setEditingHub(null);
        setIsNew(false);
        setError(null);
        setFieldErrors({});
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [editingHub, deletingHub]);

  /**
   * Opens the form to add a new service hub.
   */
  const handleAdd = (): void => {
    setError(null);
    setSaved(false);
    setFieldErrors({});
    setIsNew(true);
    setEditingHub(createBlankServiceHub());
  };

  /**
   * Opens the form to edit an existing service hub.
   *
   * @param hub - Service hub to edit.
   */
  const handleEdit = (hub: ServiceHub): void => {
    setError(null);
    setSaved(false);
    setFieldErrors({});
    setIsNew(false);
    setEditingHub({ ...hub });
  };

  /**
   * Closes the service hub editor modal.
   */
  const handleCancelEdit = (): void => {
    setEditingHub(null);
    setIsNew(false);
    setError(null);
    setFieldErrors({});
  };

  /**
   * Persists the service hub being edited.
   */
  const handleSave = async (): Promise<void> => {
    if (!editingHub) return;

    const validationErrors = validateServiceHubForm(editingHub);
    if (validationErrors) {
      setFieldErrors(validationErrors);
      return;
    }

    setSaving(true);
    setSaved(false);
    setError(null);
    setFieldErrors({});

    try {
      const payload: ServiceHub = isNew ? { ...editingHub, id: crypto.randomUUID() } : editingHub;
      await window.api.saveServiceHub(payload);
      reload();
      setEditingHub(null);
      setIsNew(false);
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  };

  /**
   * Deletes a service hub by id.
   *
   * @param id - Service hub id to delete.
   */
  const handleDelete = async (id: string): Promise<void> => {
    setError(null);
    setSaved(false);
    setDeletingHub(null);

    try {
      await window.api.deleteServiceHub(id);
      reload();
      if (editingHub?.id === id) {
        handleCancelEdit();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  return (
    <>
      <div>
        <div className="mb-4 flex items-end justify-between gap-4">
          <div className="min-w-0">
            <h2 className="m-0 mb-1 text-[14px] font-medium text-text">Service hubs</h2>
            <p className="m-0 text-[14px] text-muted">
              Connect to HarborClient Server instances for shared collections and environments.
            </p>
          </div>
          <Button
            type="button"
            className="shrink-0 whitespace-nowrap"
            disabled={loading}
            onClick={handleAdd}
          >
            Add service hub
          </Button>
        </div>

        {loading ? (
          <p className="text-[14px] text-muted">Loading…</p>
        ) : bootstrapError ? (
          <div className="flex flex-wrap items-center gap-2">
            <p className="mb-0 text-[14px] text-danger">{bootstrapError}</p>
            <Button type="button" variant="secondary" onClick={reload}>
              Retry
            </Button>
          </div>
        ) : serviceHubs.length === 0 ? (
          <p className="text-[14px] text-muted">No service hubs configured yet.</p>
        ) : (
          <ul className="m-0 flex list-none flex-col gap-2 p-0">
            {serviceHubs.map((hub) => (
              <li
                key={hub.id}
                className="flex items-center justify-between gap-3 rounded-md border border-separator px-3 py-2"
              >
                <div className="min-w-0">
                  <div className="truncate text-[14px] font-medium text-text">
                    {hub.name || 'Untitled'}
                  </div>
                  <span className="truncate text-[14px] text-muted">{hub.baseUrl}</span>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  <Button type="button" variant="secondary" onClick={() => handleEdit(hub)}>
                    Edit
                  </Button>
                  <Button type="button" variant="secondary" onClick={() => setDeletingHub(hub)}>
                    Delete
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}

        {error && !editingHub && !deletingHub && (
          <p className="mt-3 text-[14px] text-danger">{error}</p>
        )}
        {saved && <p className="mt-3 text-[14px] text-success">Service hub saved.</p>}
      </div>

      {editingHub && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={handleCancelEdit}
        >
          <div
            className="max-h-[85vh] w-[480px] overflow-y-auto rounded-lg border border-separator bg-surface p-4 shadow-xl"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="service-hub-dialog-title"
          >
            <h2
              id="service-hub-dialog-title"
              className="m-0 mb-1 text-[14px] font-semibold text-text"
            >
              {isNew ? 'Add service hub' : 'Edit service hub'}
            </h2>
            <p className="mb-4 text-[14px] text-muted">
              Enter a display name, service hub URL, and API token for HarborClient Server.
            </p>

            <ServiceHubForm
              hub={editingHub}
              disabled={saving}
              fieldErrors={fieldErrors}
              onChange={setEditingHub}
            />

            {error && <p className="mt-4 text-[14px] text-danger">{error}</p>}

            <div className="mt-4 flex justify-end gap-2">
              <Button
                type="button"
                variant="secondary"
                disabled={saving}
                onClick={handleCancelEdit}
              >
                Cancel
              </Button>
              <Button type="button" disabled={saving} onClick={() => void handleSave()}>
                {saving ? 'Saving…' : 'Save'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {deletingHub && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={() => setDeletingHub(null)}
        >
          <div
            className="w-96 rounded-lg border border-separator bg-surface p-4 shadow-xl"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-service-hub-title"
          >
            <h2
              id="delete-service-hub-title"
              className="m-0 mb-1 text-[14px] font-semibold text-text"
            >
              Delete service hub?
            </h2>
            <p className="mb-4 text-[14px] text-muted">
              Are you sure you want to delete &ldquo;
              {deletingHub.name || 'Untitled'}&rdquo;? This cannot be undone.
            </p>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setDeletingHub(null)}>
                Cancel
              </Button>
              <Button
                type="button"
                variant="secondaryDanger"
                onClick={() => void handleDelete(deletingHub.id)}
              >
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
