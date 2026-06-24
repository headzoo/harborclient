import type { JSX } from 'react';
import type { AuthConfig, AuthType, Variable } from '#/shared/types';
import { CodeEditor } from '#/renderer/src/components/CodeEditor';
import { VariableInput } from '#/renderer/src/components/VariableInput';
import { Select, fieldFrame } from '#/renderer/src/components/forms';

interface Props {
  /**
   * Current authorization settings.
   */
  auth: AuthConfig;

  /**
   * Called when auth type or credential fields change.
   *
   * @param auth - Updated authorization settings.
   */
  onChange: (auth: AuthConfig) => void;

  /**
   * Collection-scoped variables for highlighting and tooltips.
   */
  variables: Variable[];

  /**
   * Opens collection settings to edit variables.
   */
  onEditVariables?: () => void;
}

/**
 * Two-pane authorization editor with auth type selection and credential fields.
 */
export function AuthEditor({ auth, onChange, variables, onEditVariables }: Props): JSX.Element {
  /**
   * Updates the selected auth type while preserving entered credential values.
   *
   * @param type - New auth type from the dropdown.
   */
  const handleTypeChange = (type: AuthType): void => {
    onChange({ ...auth, type });
  };

  return (
    <div className="flex gap-6">
      <div className="w-[220px] shrink-0">
        <label className="mb-1 block text-[14px] text-muted" htmlFor="auth-type">
          Auth Type
        </label>
        <Select
          id="auth-type"
          className="w-full"
          value={auth.type}
          onChange={(event) => handleTypeChange(event.target.value as AuthType)}
        >
          <option value="none">None</option>
          <option value="basic">Basic Auth</option>
          <option value="bearer">Bearer Token</option>
        </Select>
      </div>

      <div className="min-w-0 flex-1">
        {auth.type === 'none' && (
          <p className="m-0 text-[14px] text-muted">
            No request-level authorization is configured. Collection authorization applies when set.
          </p>
        )}

        {auth.type === 'basic' && (
          <div className="flex flex-col gap-3">
            <div>
              <label className="mb-1 block text-[14px] text-muted" htmlFor="auth-username">
                Username
              </label>
              <VariableInput
                id="auth-username"
                wrapperClassName={`${fieldFrame} w-full`}
                value={auth.basic.username}
                onChange={(username) => onChange({ ...auth, basic: { ...auth.basic, username } })}
                variables={variables}
                onEditVariable={onEditVariables}
                placeholder="username"
                className="app-no-drag"
              />
            </div>
            <div>
              <label className="mb-1 block text-[14px] text-muted" htmlFor="auth-password">
                Password
              </label>
              <VariableInput
                id="auth-password"
                wrapperClassName={`${fieldFrame} w-full`}
                value={auth.basic.password}
                onChange={(password) => onChange({ ...auth, basic: { ...auth.basic, password } })}
                variables={variables}
                onEditVariable={onEditVariables}
                placeholder="password"
                className="app-no-drag"
              />
            </div>
          </div>
        )}

        {auth.type === 'bearer' && (
          <div>
            <label className="mb-1 block text-[14px] text-muted" htmlFor="auth-token">
              Token
            </label>
            <CodeEditor
              id="auth-token"
              value={auth.bearer.token}
              onChange={(token) => onChange({ ...auth, bearer: { token } })}
              language="text"
              placeholder="Bearer token"
              variables={variables}
              onEditVariable={onEditVariables}
              minHeight="120px"
            />
          </div>
        )}
      </div>
    </div>
  );
}
