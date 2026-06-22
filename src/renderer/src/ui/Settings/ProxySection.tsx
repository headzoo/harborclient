import { useEffect, useState, type JSX } from 'react';
import type { GeneralSettings, ProxySettings } from '#/shared/types';
import { Button } from '#/renderer/src/components/Button';
import { field } from '#/renderer/src/ui/shared/classes';
import { DEFAULT_GENERAL_SETTINGS, PROXY_PROTOCOL_OPTIONS } from './constants';

/**
 * Proxy settings: global HTTP proxy configuration for outbound requests.
 */
export function ProxySection(): JSX.Element {
  const [generalSettings, setGeneralSettings] = useState<GeneralSettings>(DEFAULT_GENERAL_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  /**
   * Loads general settings on mount so proxy fields are populated from storage.
   */
  useEffect(() => {
    let cancelled = false;
    window.api.getGeneralSettings().then((value) => {
      if (!cancelled) {
        setGeneralSettings(value);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  /**
   * Updates a proxy settings field in local form state.
   *
   * @param key - Proxy field to update.
   * @param value - New field value.
   */
  const handleProxyFieldChange = <K extends keyof ProxySettings>(
    key: K,
    value: ProxySettings[K]
  ): void => {
    setSaved(false);
    setGeneralSettings((current) => ({
      ...current,
      proxy: { ...current.proxy, [key]: value }
    }));
  };

  /**
   * Persists general settings including proxy configuration.
   */
  const handleSave = async (): Promise<void> => {
    setSaving(true);
    setSaved(false);
    try {
      await window.api.setGeneralSettings(generalSettings);
      setSaved(true);
    } finally {
      setSaving(false);
    }
  };

  const { proxy } = generalSettings;
  const fieldsDisabled = loading || saving;
  const proxyFieldsDisabled = fieldsDisabled || !proxy.enabled;
  const authFieldsDisabled = proxyFieldsDisabled || !proxy.authEnabled;

  return (
    <div className="mb-6 flex flex-col gap-2">
      <div className="mb-6 flex flex-col gap-6">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={proxy.enabled}
            disabled={fieldsDisabled}
            onChange={(event) => handleProxyFieldChange('enabled', event.target.checked)}
          />
          <span className="text-[14px] font-medium text-text">Use a proxy</span>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-[14px] font-medium text-text">Protocol</span>
          <select
            className={field}
            value={proxy.protocol}
            disabled={proxyFieldsDisabled}
            onChange={(event) =>
              handleProxyFieldChange('protocol', event.target.value as ProxySettings['protocol'])
            }
          >
            {PROXY_PROTOCOL_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-[14px] font-medium text-text">Host</span>
          <input
            type="text"
            className={field}
            value={proxy.host}
            disabled={proxyFieldsDisabled}
            placeholder="proxy.example.com"
            onChange={(event) => handleProxyFieldChange('host', event.target.value)}
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-[14px] font-medium text-text">Port</span>
          <input
            type="number"
            min={1}
            max={65535}
            className={field}
            value={proxy.port}
            disabled={proxyFieldsDisabled}
            onChange={(event) => handleProxyFieldChange('port', Number(event.target.value))}
          />
        </label>

        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={proxy.authEnabled}
            disabled={proxyFieldsDisabled}
            onChange={(event) => handleProxyFieldChange('authEnabled', event.target.checked)}
          />
          <span className="text-[14px] font-medium text-text">Use basic authentication</span>
        </label>

        {proxy.authEnabled && (
          <>
            <label className="flex flex-col gap-1">
              <span className="text-[14px] font-medium text-text">Username</span>
              <input
                type="text"
                className={field}
                value={proxy.username}
                disabled={authFieldsDisabled}
                autoComplete="off"
                onChange={(event) => handleProxyFieldChange('username', event.target.value)}
              />
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-[14px] font-medium text-text">Password</span>
              <input
                type="password"
                className={field}
                value={proxy.password}
                disabled={authFieldsDisabled}
                autoComplete="off"
                onChange={(event) => handleProxyFieldChange('password', event.target.value)}
              />
            </label>
          </>
        )}

        <p className="m-0 text-[14px] text-muted">
          When enabled, every outbound request is routed through this proxy server.
        </p>
      </div>

      <div className="flex items-center gap-3">
        <Button type="button" disabled={fieldsDisabled} onClick={() => void handleSave()}>
          {saving ? 'Saving…' : 'Save'}
        </Button>
        {saved && <span className="text-[14px] text-success">Settings saved.</span>}
      </div>
    </div>
  );
}
