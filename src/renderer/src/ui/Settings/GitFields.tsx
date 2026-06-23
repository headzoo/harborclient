import { useState, type JSX } from 'react';
import toast from 'react-hot-toast';
import type { DatabaseConnection, GitSettings } from '#/shared/types';
import { field } from '#/renderer/src/ui/shared/classes';

interface Props {
  /**
   * Git connection being edited.
   */
  connection: DatabaseConnection & { type: 'git' };

  /**
   * Whether inputs are disabled.
   */
  disabled?: boolean;

  /**
   * Called when settings change.
   */
  onChange: (connection: DatabaseConnection) => void;
}

/**
 * Git repository connection fields for database settings.
 */
export function GitFields({ connection, disabled = false, onChange }: Props): JSX.Element {
  const settings = connection.settings;
  const [patUsername, setPatUsername] = useState(
    settings.auth.kind === 'pat' ? settings.auth.username : 'token'
  );
  const [patToken, setPatToken] = useState('');
  const [oauthUserCode, setOauthUserCode] = useState<string | null>(null);
  const [authBusy, setAuthBusy] = useState(false);

  /**
   * Updates a git settings field on the parent connection.
   *
   * @param partial - Partial settings patch.
   */
  const updateSettings = (partial: Partial<GitSettings>): void => {
    onChange({
      ...connection,
      settings: { ...settings, ...partial }
    });
  };

  /**
   * Stores a PAT and validates remote credentials.
   */
  const handleSavePat = async (): Promise<void> => {
    if (!connection.id) {
      toast.error('Save the connection first, then enter a token.');
      return;
    }
    if (!patToken.trim()) {
      toast.error('Enter a personal access token.');
      return;
    }
    setAuthBusy(true);
    try {
      await window.api.gitSetPat(connection.id, patUsername, patToken);
      updateSettings({ auth: { kind: 'pat', username: patUsername.trim() || 'token' } });
      setPatToken('');
      toast.success('Token saved and validated.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setAuthBusy(false);
    }
  };

  /**
   * Starts GitHub OAuth device flow in the browser.
   */
  const handleStartOAuth = async (): Promise<void> => {
    if (!connection.id) {
      toast.error('Save the connection first, then authorize with GitHub.');
      return;
    }
    setAuthBusy(true);
    try {
      const result = await window.api.gitStartOAuth(connection.id);
      setOauthUserCode(result.userCode);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setAuthBusy(false);
    }
  };

  /**
   * Completes GitHub OAuth after the user approves in a browser.
   */
  const handleCompleteOAuth = async (): Promise<void> => {
    if (!connection.id) {
      return;
    }
    setAuthBusy(true);
    try {
      await window.api.gitCompleteOAuth(connection.id);
      updateSettings({ auth: { kind: 'oauth', provider: 'github' } });
      setOauthUserCode(null);
      toast.success('GitHub authorization complete.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setAuthBusy(false);
    }
  };

  const isGitHubUrl = settings.url.includes('github.com');

  return (
    <div className="flex flex-col gap-4">
      <label className="flex flex-col gap-1">
        <span className="text-[14px] font-medium text-text">Repository path</span>
        <input
          type="text"
          className={field}
          value={settings.repoPath}
          disabled={disabled}
          placeholder="/path/to/your/repo"
          onChange={(event) => updateSettings({ repoPath: event.target.value })}
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-[14px] font-medium text-text">Repository URL (HTTPS)</span>
        <input
          type="url"
          className={field}
          value={settings.url}
          disabled={disabled}
          placeholder="https://github.com/org/repo.git"
          onChange={(event) => updateSettings({ url: event.target.value })}
        />
        <span className="text-[13px] text-muted">
          SSH remotes are not supported; use an HTTPS URL and a token or GitHub OAuth.
        </span>
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-[14px] font-medium text-text">Branch</span>
        <input
          type="text"
          className={field}
          value={settings.branch}
          disabled={disabled}
          onChange={(event) => updateSettings({ branch: event.target.value })}
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-[14px] font-medium text-text">HarborClient subdirectory</span>
        <input
          type="text"
          className={field}
          value={settings.subdir}
          disabled={disabled}
          onChange={(event) => updateSettings({ subdir: event.target.value })}
        />
      </label>

      <div className="flex flex-col gap-2 rounded border border-border p-3">
        <span className="text-[14px] font-medium text-text">Authentication</span>
        <p className="m-0 text-[13px] text-muted">
          Current method:{' '}
          {settings.auth.kind === 'oauth' ? 'GitHub OAuth' : 'Personal access token'}
        </p>

        {isGitHubUrl && (
          <div className="flex flex-col gap-2">
            <button
              type="button"
              className="rounded bg-accent px-3 py-1.5 text-[14px] text-accent-fg disabled:opacity-50"
              disabled={disabled || authBusy}
              onClick={() => void handleStartOAuth()}
            >
              Authorize with GitHub
            </button>
            {oauthUserCode != null && (
              <p className="m-0 text-[13px] text-text">
                Enter code <strong>{oauthUserCode}</strong> in the browser, then click Complete
                authorization.
              </p>
            )}
            {oauthUserCode != null && (
              <button
                type="button"
                className="rounded border border-border px-3 py-1.5 text-[14px] disabled:opacity-50"
                disabled={disabled || authBusy}
                onClick={() => void handleCompleteOAuth()}
              >
                Complete authorization
              </button>
            )}
          </div>
        )}

        <div className="flex flex-col gap-2">
          <span className="text-[13px] font-medium text-text">Personal access token</span>
          <label className="flex flex-col gap-1">
            <span className="text-[13px] text-muted">Username</span>
            <input
              type="text"
              className={field}
              value={patUsername}
              disabled={disabled || authBusy}
              onChange={(event) => setPatUsername(event.target.value)}
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[13px] text-muted">Token</span>
            <input
              type="password"
              className={field}
              value={patToken}
              disabled={disabled || authBusy}
              onChange={(event) => setPatToken(event.target.value)}
            />
          </label>
          <button
            type="button"
            className="rounded border border-border px-3 py-1.5 text-[14px] disabled:opacity-50"
            disabled={disabled || authBusy}
            onClick={() => void handleSavePat()}
          >
            Save token
          </button>
        </div>
      </div>
    </div>
  );
}
