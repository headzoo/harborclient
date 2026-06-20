import { useEffect, useState, type JSX } from 'react';
import type { MySqlSettings } from '#/shared/types';
import { field, primaryButton } from '#/renderer/src/ui/shared/classes';
import { DEFAULT_MYSQL_SETTINGS } from './constants';

/**
 * MySQL connection settings.
 */
export function MySqlSection(): JSX.Element {
  const [mysqlSettings, setMysqlSettings] = useState<MySqlSettings>(DEFAULT_MYSQL_SETTINGS);
  const [mysqlLoading, setMysqlLoading] = useState(true);
  const [mysqlSaving, setMysqlSaving] = useState(false);
  const [mysqlSaved, setMysqlSaved] = useState(false);

  useEffect(() => {
    let cancelled = false;
    window.api.getMySqlSettings().then((value) => {
      if (!cancelled) {
        setMysqlSettings(value);
        setMysqlLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  /**
   * Updates a MySQL settings field in local form state.
   *
   * @param key - Field to update.
   * @param value - New field value.
   */
  const handleMySqlFieldChange = (key: keyof MySqlSettings, value: string | number): void => {
    setMysqlSaved(false);
    setMysqlSettings((current) => ({ ...current, [key]: value }));
  };

  /**
   * Persists MySQL settings to electron-store.
   */
  const handleMySqlSave = async (): Promise<void> => {
    setMysqlSaving(true);
    setMysqlSaved(false);
    try {
      await window.api.setMySqlSettings(mysqlSettings);
      setMysqlSaved(true);
    } finally {
      setMysqlSaving(false);
    }
  };

  return (
    <div className="mb-6">
      <h2 className="m-0 mb-1 text-[13px] font-medium text-text">MySQL</h2>
      <p className="mb-3 text-[12px] text-muted">Configure MySQL connection settings.</p>

      <div className="flex flex-col gap-4">
        <label className="flex flex-col gap-1">
          <span className="text-[12px] font-medium text-text">Host</span>
          <input
            type="text"
            className={field}
            value={mysqlSettings.host}
            disabled={mysqlLoading || mysqlSaving}
            onChange={(event) => handleMySqlFieldChange('host', event.target.value)}
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-[12px] font-medium text-text">Port</span>
          <input
            type="number"
            className={field}
            value={mysqlSettings.port}
            disabled={mysqlLoading || mysqlSaving}
            onChange={(event) => handleMySqlFieldChange('port', Number(event.target.value))}
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-[12px] font-medium text-text">User</span>
          <input
            type="text"
            className={field}
            value={mysqlSettings.user}
            disabled={mysqlLoading || mysqlSaving}
            onChange={(event) => handleMySqlFieldChange('user', event.target.value)}
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-[12px] font-medium text-text">Password</span>
          <input
            type="password"
            className={field}
            value={mysqlSettings.password}
            disabled={mysqlLoading || mysqlSaving}
            onChange={(event) => handleMySqlFieldChange('password', event.target.value)}
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-[12px] font-medium text-text">Database</span>
          <input
            type="text"
            className={field}
            value={mysqlSettings.database}
            disabled={mysqlLoading || mysqlSaving}
            onChange={(event) => handleMySqlFieldChange('database', event.target.value)}
          />
        </label>

        <div className="flex items-center gap-3">
          <button
            type="button"
            className={primaryButton}
            disabled={mysqlLoading || mysqlSaving}
            onClick={() => void handleMySqlSave()}
          >
            {mysqlSaving ? 'Saving…' : 'Save'}
          </button>
          {mysqlSaved && <span className="text-[12px] text-success">Settings saved.</span>}
        </div>

        <p className="m-0 text-[12px] text-muted">
          Changes take effect after restarting HarborClient.
        </p>
      </div>
    </div>
  );
}
