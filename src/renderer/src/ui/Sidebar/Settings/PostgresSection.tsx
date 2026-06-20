import { useEffect, useState, type JSX } from 'react';
import type { PostgresSettings } from '#/shared/types';
import { field, primaryButton } from '#/renderer/src/ui/shared/classes';
import { DEFAULT_POSTGRES_SETTINGS } from './constants';

/**
 * PostgreSQL connection settings.
 */
export function PostgresSection(): JSX.Element {
  const [postgresSettings, setPostgresSettings] =
    useState<PostgresSettings>(DEFAULT_POSTGRES_SETTINGS);
  const [postgresLoading, setPostgresLoading] = useState(true);
  const [postgresSaving, setPostgresSaving] = useState(false);
  const [postgresSaved, setPostgresSaved] = useState(false);

  useEffect(() => {
    let cancelled = false;
    window.api.getPostgresSettings().then((value) => {
      if (!cancelled) {
        setPostgresSettings(value);
        setPostgresLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  /**
   * Updates a PostgreSQL settings field in local form state.
   *
   * @param key - Field to update.
   * @param value - New field value.
   */
  const handlePostgresFieldChange = (key: keyof PostgresSettings, value: string | number): void => {
    setPostgresSaved(false);
    setPostgresSettings((current) => ({ ...current, [key]: value }));
  };

  /**
   * Persists PostgreSQL settings to electron-store.
   */
  const handlePostgresSave = async (): Promise<void> => {
    setPostgresSaving(true);
    setPostgresSaved(false);
    try {
      await window.api.setPostgresSettings(postgresSettings);
      setPostgresSaved(true);
    } finally {
      setPostgresSaving(false);
    }
  };

  return (
    <div className="mb-6">
      <h2 className="m-0 mb-1 text-[13px] font-medium text-text">PostgreSQL</h2>
      <p className="mb-3 text-[12px] text-muted">Configure PostgreSQL connection settings.</p>

      <div className="flex flex-col gap-4">
        <label className="flex flex-col gap-1">
          <span className="text-[12px] font-medium text-text">Host</span>
          <input
            type="text"
            className={field}
            value={postgresSettings.host}
            disabled={postgresLoading || postgresSaving}
            onChange={(event) => handlePostgresFieldChange('host', event.target.value)}
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-[12px] font-medium text-text">Port</span>
          <input
            type="number"
            className={field}
            value={postgresSettings.port}
            disabled={postgresLoading || postgresSaving}
            onChange={(event) => handlePostgresFieldChange('port', Number(event.target.value))}
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-[12px] font-medium text-text">User</span>
          <input
            type="text"
            className={field}
            value={postgresSettings.user}
            disabled={postgresLoading || postgresSaving}
            onChange={(event) => handlePostgresFieldChange('user', event.target.value)}
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-[12px] font-medium text-text">Password</span>
          <input
            type="password"
            className={field}
            value={postgresSettings.password}
            disabled={postgresLoading || postgresSaving}
            onChange={(event) => handlePostgresFieldChange('password', event.target.value)}
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-[12px] font-medium text-text">Database</span>
          <input
            type="text"
            className={field}
            value={postgresSettings.database}
            disabled={postgresLoading || postgresSaving}
            onChange={(event) => handlePostgresFieldChange('database', event.target.value)}
          />
        </label>

        <div className="flex items-center gap-3">
          <button
            type="button"
            className={primaryButton}
            disabled={postgresLoading || postgresSaving}
            onClick={() => void handlePostgresSave()}
          >
            {postgresSaving ? 'Saving…' : 'Save'}
          </button>
          {postgresSaved && <span className="text-[12px] text-success">Settings saved.</span>}
        </div>

        <p className="m-0 text-[12px] text-muted">
          Changes take effect after restarting HarborClient.
        </p>
      </div>
    </div>
  );
}
