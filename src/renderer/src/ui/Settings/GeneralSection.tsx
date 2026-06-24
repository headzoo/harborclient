import { useEffect, useState, type JSX } from 'react';
import toast from 'react-hot-toast';
import type { GeneralSettings, ThemeSource } from '#/shared/types';
import { Button } from '#/renderer/src/components/Button';
import { applyThemeAttribute } from '#/renderer/src/theme';
import { Input, Select } from '#/renderer/src/components/forms';
import { DEFAULT_GENERAL_SETTINGS, THEME_OPTIONS } from './constants';

/**
 * General settings: appearance and HTTP request defaults.
 */
export function GeneralSection(): JSX.Element {
  const [theme, setTheme] = useState<ThemeSource>('system');
  const [loading, setLoading] = useState(true);
  const [generalSettings, setGeneralSettings] = useState<GeneralSettings>(DEFAULT_GENERAL_SETTINGS);
  const [generalLoading, setGeneralLoading] = useState(true);
  const [generalSaving, setGeneralSaving] = useState(false);

  /**
   * Loads the persisted theme preference on mount.
   */
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

  /**
   * Loads general request settings on mount.
   */
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

  /**
   * Updates the theme preference in local form state.
   *
   * @param next - Theme source selected in the dropdown.
   */
  const handleThemeChange = (next: ThemeSource): void => {
    setTheme(next);
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
    setGeneralSettings((current) => ({ ...current, [key]: value }));
  };

  /**
   * Persists general request settings and the selected theme preference.
   */
  const handleGeneralSave = async (): Promise<void> => {
    setGeneralSaving(true);
    try {
      applyThemeAttribute(theme);
      await window.api.setTheme(theme);
      await window.api.setGeneralSettings(generalSettings);
      toast.success('Settings saved.');
    } finally {
      setGeneralSaving(false);
    }
  };

  return (
    <div className="mb-6 flex flex-col gap-2">
      <div className="mb-6 flex flex-col gap-6">
        <label className="flex flex-col gap-1">
          <span className="text-[14px] font-medium text-text">Theme</span>
          <Select
            value={theme}
            disabled={loading || generalLoading || generalSaving}
            onChange={(event) => handleThemeChange(event.target.value as ThemeSource)}
          >
            {THEME_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-[14px] font-medium text-text">Request timeout (ms)</span>
          <Input
            type="number"
            min={0}
            value={generalSettings.requestTimeoutMs}
            disabled={generalLoading || generalSaving}
            onChange={(event) =>
              handleGeneralFieldChange('requestTimeoutMs', Number(event.target.value))
            }
          />
          <p className="m-0 text-[14px] text-muted">Set to 0 to disable the limit.</p>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-[14px] font-medium text-text">Max response size (MB)</span>
          <Input
            type="number"
            min={0}
            value={generalSettings.maxResponseSizeMb}
            disabled={generalLoading || generalSaving}
            onChange={(event) =>
              handleGeneralFieldChange('maxResponseSizeMb', Number(event.target.value))
            }
          />
          <p className="m-0 text-[14px] text-muted">
            Set to 0 for no configurable limit (512 MB hard cap still applies).
          </p>
        </label>

        <label className="flex items-center gap-2">
          <Input
            type="checkbox"
            checked={generalSettings.verifySsl}
            disabled={generalLoading || generalSaving}
            onChange={(event) => handleGeneralFieldChange('verifySsl', event.target.checked)}
          />
          <span className="text-[14px] font-medium text-text">SSL certificate verification</span>
        </label>
      </div>

      <div className="flex items-center gap-3">
        <Button
          type="button"
          disabled={generalLoading || generalSaving}
          onClick={() => void handleGeneralSave()}
        >
          {generalSaving ? 'Saving…' : 'Save'}
        </Button>
      </div>
    </div>
  );
}
