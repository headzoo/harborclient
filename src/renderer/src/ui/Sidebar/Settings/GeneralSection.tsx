import { useEffect, useState, type JSX } from 'react';
import type { DatabaseProvider, GeneralSettings, ThemeSource } from '#/shared/types';
import { field, primaryButton } from '#/renderer/src/ui/shared/classes';
import { DEFAULT_GENERAL_SETTINGS, PROVIDER_OPTIONS, THEME_OPTIONS } from './constants';

/**
 * General settings: appearance, requests, and database provider.
 */
export function GeneralSection(): JSX.Element {
  const [theme, setTheme] = useState<ThemeSource>('system');
  const [loading, setLoading] = useState(true);
  const [generalSettings, setGeneralSettings] = useState<GeneralSettings>(DEFAULT_GENERAL_SETTINGS);
  const [generalLoading, setGeneralLoading] = useState(true);
  const [generalSaving, setGeneralSaving] = useState(false);
  const [generalSaved, setGeneralSaved] = useState(false);
  const [databaseProvider, setDatabaseProvider] = useState<DatabaseProvider>('sqlite');
  const [providerLoading, setProviderLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    window.api.getTheme().then((value) => {
      if (!cancelled) {
        setTheme(value);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    window.api.getGeneralSettings().then((value) => {
      if (!cancelled) {
        setGeneralSettings(value);
        setGeneralLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    window.api.getDatabaseProvider().then((value) => {
      if (!cancelled) {
        setDatabaseProvider(value);
        setProviderLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  /**
   * Persists and applies the selected theme.
   *
   * @param next - Theme source to apply.
   */
  const handleThemeChange = async (next: ThemeSource): Promise<void> => {
    setTheme(next);
    await window.api.setTheme(next);
  };

  /**
   * Updates a general settings field in local form state.
   *
   * @param key - Field to update.
   * @param value - New field value.
   */
  const handleGeneralFieldChange = <K extends keyof GeneralSettings>(
    key: K,
    value: GeneralSettings[K]
  ): void => {
    setGeneralSaved(false);
    setGeneralSettings((current) => ({ ...current, [key]: value }));
  };

  /**
   * Persists general request settings and database provider.
   */
  const handleGeneralSave = async (): Promise<void> => {
    setGeneralSaving(true);
    setGeneralSaved(false);
    try {
      await window.api.setGeneralSettings(generalSettings);
      await window.api.setDatabaseProvider(databaseProvider);
      setGeneralSaved(true);
    } finally {
      setGeneralSaving(false);
    }
  };

  /**
   * Updates the selected database provider in local form state.
   *
   * @param next - Provider to use on next launch.
   */
  const handleProviderChange = (next: DatabaseProvider): void => {
    setGeneralSaved(false);
    setDatabaseProvider(next);
  };

  return (
    <div className="mb-6 flex flex-col gap-2">
      <div className="mb-6 flex flex-col gap-6">
        <label className="flex flex-col gap-1">
          <span className="text-[12px] font-medium text-text">Theme</span>
          <select
            className={field}
            value={theme}
            disabled={loading}
            onChange={(event) => void handleThemeChange(event.target.value as ThemeSource)}
          >
            {THEME_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-[12px] font-medium text-text">Request timeout (ms)</span>
          <input
            type="number"
            min={0}
            className={field}
            value={generalSettings.requestTimeoutMs}
            disabled={generalLoading || generalSaving}
            onChange={(event) =>
              handleGeneralFieldChange('requestTimeoutMs', Number(event.target.value))
            }
          />
          <p className="m-0 text-[12px] text-muted">Set to 0 to disable the limit.</p>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-[12px] font-medium text-text">Max response size (MB)</span>
          <input
            type="number"
            min={0}
            className={field}
            value={generalSettings.maxResponseSizeMb}
            disabled={generalLoading || generalSaving}
            onChange={(event) =>
              handleGeneralFieldChange('maxResponseSizeMb', Number(event.target.value))
            }
          />
          <p className="m-0 text-[12px] text-muted">Set to 0 to disable the limit.</p>
        </label>

        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={generalSettings.verifySsl}
            disabled={generalLoading || generalSaving}
            onChange={(event) => handleGeneralFieldChange('verifySsl', event.target.checked)}
          />
          <span className="text-[12px] font-medium text-text">SSL certificate verification</span>
        </label>
      </div>

      <div>
        <label className="flex flex-col gap-1">
          <span className="text-[12px] font-medium text-text">Database provider</span>
          <select
            className={field}
            value={databaseProvider}
            disabled={providerLoading || generalLoading || generalSaving}
            onChange={(event) => handleProviderChange(event.target.value as DatabaseProvider)}
          >
            {PROVIDER_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <p className="mb-3 text-[12px] text-muted">
          Choose whether collections and requests are stored in SQLite, Firestore, MySQL, or
          PostgreSQL.
        </p>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          className={primaryButton}
          disabled={generalLoading || providerLoading || generalSaving}
          onClick={() => void handleGeneralSave()}
        >
          {generalSaving ? 'Saving…' : 'Save'}
        </button>
        {generalSaved && <span className="text-[12px] text-success">Settings saved.</span>}
      </div>
      <p className="mb-0 mt-3 text-[12px] text-muted">
        Changes take effect after restarting HarborClient.
      </p>
    </div>
  );
}
