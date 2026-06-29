import { ipcMain, webContents, type WebContents } from 'electron';
import type { BrowserWindow } from 'electron';
import type { PluginManager } from '#/main/plugins/PluginManager';
import { getPluginDatabaseManager } from '#/main/plugins/pluginDatabaseManagerInstance';
import { activatePluginMain, invokePluginIpc } from '#/main/plugins/pluginRunnerHost';
import type { PluginPermission } from '#/shared/plugin/types';
import { toActiveTheme } from '#/shared/plugin/types';
import type { ThemeSource } from '#/shared/types';

/** Permission required for each broker operation. */
const OP_PERMISSIONS: Record<string, PluginPermission | 'ui'> = {
  'storage.get': 'storage',
  'storage.set': 'storage',
  'database.query': 'database',
  'database.exec': 'database',
  'database.beginTransaction': 'database',
  'database.endTransaction': 'database',
  'fs.pickFile': 'filesystem:pick',
  'fs.pickDirectory': 'filesystem:pick',
  'fs.saveFile': 'filesystem:pick',
  'fs.readFile': 'filesystem:read',
  'fs.writeFile': 'filesystem:write',
  'fs.watchFile': 'filesystem:read',
  'ipc.invoke': 'ipc',
  'themes.register': 'ui',
  'themes.unregister': 'ui',
  'themes.getActive': 'ui',
  registerContribution: 'ui',
  unregisterContribution: 'ui',
  'ui.showToast': 'ui',
  'commands.execute': 'ui',
  'commands.executeRemote': 'ui',
  'host.openRequestDraft': 'ui',
  'host.loadRequest': 'ui',
  'host.sendRequest': 'ui',
  'host.createEnvironmentWithVariables': 'ui',
  'host.updateEnvironmentVariables': 'ui',
  'host.createCollection': 'ui',
  'host.listCollectionRequests': 'ui',
  'host.getCollectionMetadata': 'ui',
  'host.logRequestToConsole': 'ui',
  'host.sendHttpRequest': 'ui',
  'host.clearResponse': 'ui',
  'view.getContext': 'ui'
};

interface PluginWebviewSession {
  pluginId: string;
  role: 'agent' | 'view';
  contributionId?: string;
  kind?: string;
}

/**
 * Routes permission-checked plugin UI bridge calls between isolated webviews,
 * the host renderer, and existing plugin infrastructure.
 */
export class PluginUiBroker {
  readonly #pluginManager: PluginManager;
  readonly #sessions = new Map<number, PluginWebviewSession>();
  readonly #agentReady = new Set<string>();
  /**
   * Last context snapshot per `${pluginId}::${contributionId}::${kind}`, so a
   * surface webview can pull the current context after it subscribes (the push
   * on mount/dom-ready can race ahead of the guest's subscription).
   */
  readonly #viewContextCache = new Map<string, unknown>();
  #mainWindow: (() => BrowserWindow | null) | null = null;
  #getTheme: (() => Promise<ThemeSource>) | null = null;

  /**
   * @param pluginManager - Plugin manager for permissions and storage.
   */
  constructor(pluginManager: PluginManager) {
    this.#pluginManager = pluginManager;
  }

  /**
   * Supplies the main application window used to forward host commands.
   *
   * @param getter - Returns the current main window or null when destroyed.
   */
  setMainWindow(getter: () => BrowserWindow | null): void {
    this.#mainWindow = getter;
  }

  /**
   * Supplies a callback that reads the persisted active theme.
   *
   * @param getter - Returns the current theme preference.
   */
  setThemeGetter(getter: () => Promise<ThemeSource>): void {
    this.#getTheme = getter;
  }

  /**
   * Registers IPC handlers for plugin webview bridge invocations.
   */
  registerIpcHandlers(): void {
    ipcMain.handle(
      'plugins:uiBridge',
      async (event, message: { op: string; payload?: unknown }) => {
        return this.handleInvoke(event.sender, message.op, message.payload);
      }
    );

    ipcMain.on('plugins:uiRegisterSession', (event, session: PluginWebviewSession) => {
      this.#sessions.set(event.sender.id, session);
    });
  }

  /**
   * Marks an agent webview as ready after successful activation.
   *
   * @param pluginId - Plugin manifest id.
   */
  markAgentReady(pluginId: string): void {
    this.#agentReady.add(pluginId);
    const window = this.#mainWindow?.();
    if (window && !window.isDestroyed()) {
      window.webContents.send('plugins:agentReady', { pluginId });
    }
  }

  /**
   * Notifies the host renderer when an agent webview fails during bootstrap.
   *
   * @param pluginId - Plugin manifest id.
   * @param message - Activation failure message.
   */
  markAgentFailed(pluginId: string, message: string): void {
    const window = this.#mainWindow?.();
    if (window && !window.isDestroyed()) {
      window.webContents.send('plugins:agentFailed', { pluginId, message });
    }
  }

  /**
   * Returns whether the agent webview for a plugin has finished activation.
   *
   * @param pluginId - Plugin manifest id.
   */
  isAgentReady(pluginId: string): boolean {
    return this.#agentReady.has(pluginId);
  }

  /**
   * Clears broker state when a plugin webview is destroyed.
   *
   * @param webContentsId - Destroyed webContents id.
   */
  clearSession(webContentsId: number): void {
    this.#sessions.delete(webContentsId);
  }

  /**
   * Clears agent readiness when a plugin is unloaded.
   *
   * @param pluginId - Plugin manifest id.
   */
  clearPlugin(pluginId: string): void {
    this.#agentReady.delete(pluginId);
  }

  /**
   * Pushes serialized tab/view context to matching plugin surface webviews.
   *
   * @param pluginId - Plugin manifest id.
   * @param contributionId - Manifest contribution id.
   * @param kind - Contribution bucket key.
   * @param context - Serializable context snapshot.
   */
  pushViewContext(pluginId: string, contributionId: string, kind: string, context: unknown): void {
    this.#viewContextCache.set(`${pluginId}::${contributionId}::${kind}`, context);
    for (const [webContentsId, session] of this.#sessions.entries()) {
      if (
        session.role === 'view' &&
        session.pluginId === pluginId &&
        session.contributionId === contributionId &&
        session.kind === kind
      ) {
        this.#getWebContentsById(webContentsId)?.send('plugin-ui:event', {
          channel: 'view.context',
          payload: context
        });
      }
    }
  }

  /**
   * Pushes theme updates to every active plugin webview for one plugin.
   *
   * @param pluginId - Plugin manifest id.
   * @param theme - Theme payload for isolated surfaces.
   */
  pushTheme(pluginId: string, theme: { dataTheme: string | null; cssText: string }): void {
    for (const [webContentsId, session] of this.#sessions.entries()) {
      if (session.pluginId !== pluginId) {
        continue;
      }
      this.#getWebContentsById(webContentsId)?.send('plugin-ui:event', {
        channel: 'themes.changed',
        payload: toActiveTheme((theme.dataTheme ?? 'system') as ThemeSource)
      });
      this.#getWebContentsById(webContentsId)?.send('plugin-ui:event', {
        channel: 'theme.styles',
        payload: theme
      });
    }
  }

  /**
   * Forwards a command execution request to a plugin agent webview.
   *
   * @param pluginId - Target plugin manifest id.
   * @param commandId - Command id declared in the manifest.
   * @param args - Command handler arguments.
   */
  executeCommand(pluginId: string, commandId: string, args: unknown[]): void {
    for (const [webContentsId, session] of this.#sessions.entries()) {
      if (session.role === 'agent' && session.pluginId === pluginId) {
        this.#getWebContentsById(webContentsId)?.send('plugin-ui:event', {
          channel: 'commands.execute',
          payload: { commandId, args }
        });
        return;
      }
    }
    throw new Error(`Plugin agent is not active: ${pluginId}`);
  }

  /**
   * Dispatches one bridge operation for a plugin webview.
   *
   * @param sender - Calling webContents.
   * @param op - Operation name.
   * @param payload - Serializable payload.
   */
  async handleInvoke(sender: WebContents, op: string, payload: unknown): Promise<unknown> {
    const session = this.#sessions.get(sender.id);
    if (!session) {
      throw new Error('Unknown plugin webview session.');
    }

    this.#assertOpPermission(session.pluginId, op);

    switch (op) {
      case 'storage.get': {
        const { key } = payload as { key: string };
        return this.#pluginManager.getStorageValue(session.pluginId, key);
      }
      case 'storage.set': {
        const { key, value } = payload as { key: string; value: unknown };
        await this.#pluginManager.setStorageValue(session.pluginId, key, value);
        return undefined;
      }
      case 'database.query': {
        const { mode, sql, params, txnId } = payload as {
          mode: 'get' | 'all' | 'run';
          sql: string;
          params?: unknown[];
          txnId?: string;
        };
        const db = getPluginDatabaseManager();
        if (mode === 'get') {
          return db.get(session.pluginId, sql, params, txnId);
        }
        if (mode === 'all') {
          return db.all(session.pluginId, sql, params, txnId);
        }
        return db.run(session.pluginId, sql, params, txnId);
      }
      case 'database.exec': {
        const { sql } = payload as { sql: string };
        return getPluginDatabaseManager().exec(session.pluginId, sql);
      }
      case 'database.beginTransaction': {
        return getPluginDatabaseManager().beginTransaction(session.pluginId);
      }
      case 'database.endTransaction': {
        const { txnId, action } = payload as { txnId: string; action: 'commit' | 'rollback' };
        return getPluginDatabaseManager().endTransaction(session.pluginId, txnId, action);
      }
      case 'ipc.invoke': {
        const { channel, args } = payload as { channel: string; args: unknown[] };
        try {
          return await invokePluginIpc(session.pluginId, channel, args ?? []);
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          if (!message.includes('Plugin main runtime is not active')) {
            throw error;
          }
          const { source, permissions } = this.#pluginManager.resolveMainActivation(
            session.pluginId
          );
          await activatePluginMain(session.pluginId, source, permissions);
          return invokePluginIpc(session.pluginId, channel, args ?? []);
        }
      }
      case 'themes.getActive': {
        const theme = this.#getTheme ? await this.#getTheme() : 'system';
        return toActiveTheme(theme);
      }
      case 'view.getContext': {
        const key = `${session.pluginId}::${session.contributionId}::${session.kind}`;
        return this.#viewContextCache.has(key) ? this.#viewContextCache.get(key) : null;
      }
      case 'registerContribution':
      case 'unregisterContribution': {
        this.#mainWindow?.()?.webContents.send('plugins:contributions', {
          pluginId: session.pluginId,
          op,
          ...(payload as Record<string, unknown>)
        });
        return undefined;
      }
      case 'commands.executeRemote': {
        const {
          pluginId: targetPluginId,
          commandId,
          args
        } = payload as {
          pluginId: string;
          commandId: string;
          args?: unknown[];
        };
        this.executeCommand(targetPluginId, commandId, args ?? []);
        return undefined;
      }
      case 'ui.showToast':
      case 'host.openRequestDraft':
      case 'host.loadRequest':
      case 'host.sendRequest':
      case 'host.createEnvironmentWithVariables':
      case 'host.updateEnvironmentVariables':
      case 'host.createCollection':
      case 'host.listCollectionRequests':
      case 'host.getCollectionMetadata':
      case 'host.logRequestToConsole':
      case 'host.sendHttpRequest':
      case 'host.clearResponse':
      case 'commands.execute': {
        this.#mainWindow?.()?.webContents.send('plugins:hostBridge', {
          pluginId: session.pluginId,
          op,
          payload
        });
        return undefined;
      }
      default:
        throw new Error(`Unsupported plugin UI bridge operation: ${op}`);
    }
  }

  /**
   * Asserts that a plugin declares the permission required for an operation.
   *
   * @param pluginId - Plugin manifest id.
   * @param op - Broker operation name.
   */
  #assertOpPermission(pluginId: string, op: string): void {
    const required = OP_PERMISSIONS[op];
    if (!required) {
      return;
    }
    this.#pluginManager.assertPermission(pluginId, required);
  }

  /**
   * Resolves a webContents instance by numeric id.
   *
   * @param webContentsId - Electron webContents id.
   */
  #getWebContentsById(webContentsId: number): WebContents | null {
    return webContents.fromId(webContentsId) ?? null;
  }
}

let brokerInstance: PluginUiBroker | null = null;

/**
 * Returns the singleton plugin UI broker instance.
 */
export function getPluginUiBroker(): PluginUiBroker {
  if (!brokerInstance) {
    throw new Error('Plugin UI broker is not initialized.');
  }
  return brokerInstance;
}

/**
 * Initializes the plugin UI broker singleton.
 *
 * @param pluginManager - Initialized plugin manager.
 */
export function initPluginUiBroker(pluginManager: PluginManager): PluginUiBroker {
  brokerInstance = new PluginUiBroker(pluginManager);
  brokerInstance.registerIpcHandlers();
  return brokerInstance;
}
