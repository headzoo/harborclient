import type { PluginInfo } from '#/shared/plugin/types';
import { buildPluginAgentUrl } from '#/shared/plugin/pluginSurface';
import { clearPluginContributions } from '#/renderer/src/plugins/registry';
import { applyPersistedPluginTheme } from '#/renderer/src/plugins/themeRuntime';

/** Tracks hidden agent webviews mounted for enabled plugins. */
const agentWebviews = new Map<string, Electron.WebviewTag>();

/** Pending agent-ready promises keyed by plugin id. */
const agentReadyWaiters = new Map<
  string,
  { resolve: () => void; reject: (error: Error) => void; timeout: ReturnType<typeof setTimeout> }
>();

/** Maximum time to wait for a plugin agent webview to finish activation. */
export const AGENT_READY_TIMEOUT_MS = 30000;

/**
 * Waits until the plugin agent webview reports successful activation.
 *
 * @param pluginId - Plugin manifest id.
 */
function waitForAgentReady(pluginId: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      agentReadyWaiters.delete(pluginId);
      reject(new Error(`Plugin ${pluginId} agent webview timed out.`));
    }, AGENT_READY_TIMEOUT_MS);
    agentReadyWaiters.set(pluginId, { resolve, reject, timeout });
  });
}

/**
 * Resolves a pending agent-ready waiter when the broker notifies the host.
 *
 * @param pluginId - Plugin manifest id.
 */
export function notifyAgentReady(pluginId: string): void {
  const waiter = agentReadyWaiters.get(pluginId);
  if (!waiter) {
    return;
  }
  clearTimeout(waiter.timeout);
  agentReadyWaiters.delete(pluginId);
  waiter.resolve();
}

/**
 * Creates or returns the off-screen container used for plugin agent webviews.
 *
 * Agent webviews must not live under `display: none`; Electron may never load
 * their guest documents in that state.
 */
function ensureAgentContainer(): HTMLElement {
  let container = document.getElementById('plugin-agent-webviews');
  if (!container) {
    container = document.createElement('div');
    container.id = 'plugin-agent-webviews';
    container.style.position = 'fixed';
    container.style.left = '-10000px';
    container.style.top = '0';
    container.style.width = '640px';
    container.style.height = '480px';
    container.style.overflow = 'hidden';
    container.style.opacity = '0';
    container.style.pointerEvents = 'none';
    container.style.zIndex = '-1';
    document.body.appendChild(container);
  }
  return container;
}

/**
 * Rejects a pending agent-ready waiter when the agent webview fails to load.
 *
 * @param pluginId - Plugin manifest id.
 * @param message - Failure description for Settings and logs.
 */
export function rejectAgentReady(pluginId: string, message: string): void {
  const waiter = agentReadyWaiters.get(pluginId);
  if (!waiter) {
    return;
  }
  clearTimeout(waiter.timeout);
  agentReadyWaiters.delete(pluginId);
  waiter.reject(new Error(message));
}

/**
 * Mounts the hidden agent webview for one plugin if it is not already present.
 *
 * @param plugin - Plugin metadata from the main process.
 */
function mountAgentWebview(plugin: PluginInfo): void {
  if (!plugin.manifest.renderer || agentWebviews.has(plugin.id)) {
    return;
  }
  const agentUrl = buildPluginAgentUrl(plugin.id);
  const webview = document.createElement('webview') as Electron.WebviewTag;
  webview.setAttribute('src', agentUrl);
  webview.partition = `persist:plugin-${plugin.id}`;
  webview.setAttribute('allowpopups', 'false');
  webview.style.width = '640px';
  webview.style.height = '480px';
  webview.addEventListener('did-fail-load', (event) => {
    if (event.isMainFrame) {
      rejectAgentReady(
        plugin.id,
        `Plugin ${plugin.id} agent webview failed to load (${event.errorDescription}).`
      );
    }
  });
  webview.addEventListener('console-message', (event) => {
    if (event.level >= 2) {
      console.error(`[plugin agent ${plugin.id}]`, event.message);
    }
  });
  ensureAgentContainer().appendChild(webview);
  agentWebviews.set(plugin.id, webview);
}

/**
 * Removes the hidden agent webview for one plugin.
 *
 * @param pluginId - Plugin manifest id.
 */
function unmountAgentWebview(pluginId: string): void {
  const webview = agentWebviews.get(pluginId);
  if (!webview) {
    return;
  }
  webview.remove();
  agentWebviews.delete(pluginId);
}

/** Matches unique blob URLs appended to dynamic import failure messages. */
const DYNAMIC_IMPORT_BLOB_URL_PATTERN = /:\s*blob:[^\s)]+/g;

/**
 * Replaces unstable blob URLs in error text so terminal logs stay readable.
 *
 * @param text - Raw error message or stack line.
 * @returns Text with blob URLs replaced by a stable placeholder.
 */
function omitBlobUrlsFromErrorText(text: string): string {
  return text.replace(DYNAMIC_IMPORT_BLOB_URL_PATTERN, ': [blob URL omitted]');
}

/**
 * Normalizes activation error messages for persistence.
 *
 * @param error - Thrown activation error.
 */
export function normalizePluginActivationError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  if (message.includes('Failed to fetch dynamically imported module')) {
    return 'Failed to load plugin module.';
  }
  return message;
}

/**
 * Formats an activation error for terminal logging, including nested causes.
 *
 * @param error - Thrown activation error.
 */
export function formatPluginActivationErrorDetails(error: unknown): string {
  const lines: string[] = [];
  let current: unknown = error;
  let depth = 0;

  while (current !== undefined && current !== null && depth < 8) {
    if (current instanceof Error) {
      lines.push(
        depth === 0
          ? omitBlobUrlsFromErrorText(current.message)
          : `Caused by: ${omitBlobUrlsFromErrorText(current.message)}`
      );
      if (depth === 0 && current.stack) {
        lines.push(omitBlobUrlsFromErrorText(current.stack));
      }
      current = current.cause;
    } else {
      lines.push(depth === 0 ? String(current) : `Caused by: ${String(current)}`);
      current = undefined;
    }
    depth += 1;
  }

  return lines.join('\n');
}

/**
 * Disables a plugin and persists its activation failure for Settings.
 *
 * @param plugin - Plugin metadata from the main process.
 * @param error - Thrown activation error.
 */
async function handleActivationFailure(plugin: PluginInfo, error: unknown): Promise<void> {
  const message = normalizePluginActivationError(error);
  const logDetails = formatPluginActivationErrorDetails(error);
  try {
    await window.api.setPluginEnabled(plugin.id, false);
  } catch {
    // Best-effort disable when activation fails.
  }
  try {
    await window.api.reportPluginRuntimeError(plugin.id, message, logDetails);
  } catch {
    // Best-effort persistence for Settings display.
  }
}

/**
 * Clears a stale runtime error after successful activation.
 *
 * @param pluginId - Plugin manifest id.
 */
async function clearActivationError(pluginId: string): Promise<void> {
  try {
    await window.api.reportPluginRuntimeError(pluginId, null);
  } catch {
    // Best-effort clear when the main process is unavailable.
  }
}

/**
 * Clears pending agent waiters and tracked webviews — test helper only.
 */
export function resetPluginLoaderForTests(): void {
  for (const [pluginId, waiter] of agentReadyWaiters.entries()) {
    clearTimeout(waiter.timeout);
    agentReadyWaiters.delete(pluginId);
  }
  agentWebviews.clear();
}

/**
 * Deactivates and unloads one plugin from the renderer host.
 *
 * @param pluginId - Plugin manifest id.
 */
export async function unloadPlugin(pluginId: string): Promise<void> {
  unmountAgentWebview(pluginId);
  clearPluginContributions(pluginId);
  try {
    await window.api.deactivatePluginMain(pluginId);
  } catch {
    // Main entry may not have been active.
  }
  await applyPersistedPluginTheme();
}

/**
 * Activates one enabled plugin through its hidden agent webview.
 *
 * @param plugin - Plugin metadata from the main process.
 */
async function loadPlugin(plugin: PluginInfo): Promise<void> {
  if (!plugin.enabled || plugin.error) {
    return;
  }

  await unloadPlugin(plugin.id);

  try {
    if (!plugin.manifest.renderer) {
      if (plugin.manifest.main) {
        await window.api.activatePluginMain(plugin.id);
      }
      await clearActivationError(plugin.id);
      return;
    }

    const readyPromise = waitForAgentReady(plugin.id);
    mountAgentWebview(plugin);
    await readyPromise;

    if (plugin.manifest.main) {
      await window.api.activatePluginMain(plugin.id);
    }

    await applyPersistedPluginTheme();
    await clearActivationError(plugin.id);
  } catch (error) {
    await handleActivationFailure(plugin, error);
    throw error;
  }
}

/**
 * Reloads all enabled plugins from disk.
 */
export async function reloadAllPlugins(): Promise<void> {
  const plugins = await window.api.listPlugins();
  for (const plugin of plugins) {
    if (plugin.enabled) {
      try {
        await loadPlugin(plugin);
      } catch {
        // Error already reported; continue loading other plugins.
      }
    } else {
      await unloadPlugin(plugin.id);
    }
  }
}

/**
 * Reloads one plugin by id.
 *
 * @param pluginId - Plugin manifest id.
 */
export async function reloadPlugin(pluginId: string): Promise<void> {
  const plugins = await window.api.listPlugins();
  const plugin = plugins.find((entry) => entry.id === pluginId);
  if (!plugin || !plugin.enabled) {
    await unloadPlugin(pluginId);
    return;
  }
  await loadPlugin(plugin);
}

/**
 * Unloads every plugin currently held by the renderer host.
 */
export async function unloadAllPlugins(): Promise<void> {
  for (const pluginId of [...agentWebviews.keys()]) {
    await unloadPlugin(pluginId);
  }
}

/**
 * Marks a plugin for a theme switch prompt after the next successful activation.
 *
 * @param pluginId - Plugin manifest id.
 */
export function markPluginForThemePrompt(pluginId: string): void {
  void pluginId;
  // Theme prompt remains host-side; agent webviews receive theme pushes separately.
}

/**
 * Rolls back partial activation state when agent startup fails.
 *
 * @param pluginId - Plugin manifest id.
 */
export async function disposePartialRendererActivation(pluginId: string): Promise<void> {
  await unloadPlugin(pluginId);
}
