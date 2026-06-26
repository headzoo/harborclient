import type { PluginVariableInput } from '@harborclient/sdk';
import type { Variable } from '#/shared/types';
import { store } from '#/renderer/src/store/redux';
import { saveGlobalVariables } from '#/renderer/src/store/thunks/settings';
import { registerCommand } from '#/renderer/src/plugins/createPluginContext';
import { pluginVariablesToVariables } from '#/renderer/src/plugins/hostEnvironmentCommands';

const HOST_PLUGIN_ID = 'harborclient';

/**
 * Returns the current app-wide global variables from the renderer store.
 *
 * @returns Normalized global variable rows.
 */
export function getGlobalVariables(): Variable[] {
  return store.getState().settings.general.globalVariables;
}

/**
 * Replaces all app-wide global variables with plugin-provided rows.
 *
 * @param variables - Variable rows that fully replace the current list.
 */
export async function updateGlobalVariables(variables: PluginVariableInput[]): Promise<void> {
  const normalizedVariables = pluginVariablesToVariables(variables);
  await store.dispatch(saveGlobalVariables(normalizedVariables)).unwrap();
}

/**
 * Registers host commands that let plugins update global variables.
 *
 * @returns Disposer that unregisters the host global variable commands.
 */
export function registerHostGlobalsCommands(): () => void {
  const disposables = [
    registerCommand(HOST_PLUGIN_ID, 'updateGlobalVariables', async (variables) => {
      await updateGlobalVariables(variables as PluginVariableInput[]);
    })
  ];

  return () => {
    for (const disposable of disposables) {
      disposable.dispose();
    }
  };
}
