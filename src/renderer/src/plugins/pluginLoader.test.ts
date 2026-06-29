import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { PluginInfo } from '#/shared/plugin/types';
import {
  disposePartialRendererActivation,
  formatPluginActivationErrorDetails,
  markPluginForThemePrompt,
  normalizePluginActivationError,
  notifyAgentReady,
  reloadPlugin,
  unloadAllPlugins,
  unloadPlugin,
  resetPluginLoaderForTests
} from '#/renderer/src/plugins/pluginLoader';
import {
  clearPluginContributions,
  getRegisteredSettingsSections,
  registerSettingsSectionContribution
} from '#/renderer/src/plugins/registry';

const FAILED_PLUGIN_ID = 'com.example.failed';
const GATED_PLUGIN_ID = 'com.example.gated';

const listPluginsMock = vi.fn<() => Promise<PluginInfo[]>>();
const activatePluginMainMock = vi.fn<(pluginId: string) => Promise<void>>();
const deactivatePluginMainMock = vi.fn<(pluginId: string) => Promise<void>>();
const reportPluginRuntimeErrorMock =
  vi.fn<(pluginId: string, message: string | null, logDetails?: string) => Promise<PluginInfo>>();
const setPluginEnabledMock = vi.fn<(pluginId: string, enabled: boolean) => Promise<PluginInfo>>();

const createdWebviews: Array<{ remove: ReturnType<typeof vi.fn>; src: string }> = [];

/**
 * Minimal plugin metadata used by reloadPlugin gating tests.
 */
function createGatedPluginInfo(enabled: boolean): PluginInfo {
  return {
    id: GATED_PLUGIN_ID,
    name: 'Gated Plugin',
    version: '1.0.0',
    source: 'installed',
    path: '/tmp/gated-plugin',
    enabled,
    permissions: ['ui'],
    manifest: {
      id: GATED_PLUGIN_ID,
      name: 'Gated Plugin',
      version: '1.0.0',
      engines: { harborclient: '>=1.0.0' },
      renderer: 'dist/renderer.js',
      permissions: ['ui']
    }
  };
}

const agentContainer = {
  id: 'plugin-agent-webviews',
  appendChild: vi.fn(),
  remove: vi.fn()
};

beforeEach(() => {
  createdWebviews.length = 0;
  agentContainer.appendChild.mockReset();
  listPluginsMock.mockReset();
  activatePluginMainMock.mockReset();
  deactivatePluginMainMock.mockReset();
  reportPluginRuntimeErrorMock.mockReset();
  setPluginEnabledMock.mockReset();
  activatePluginMainMock.mockResolvedValue(undefined);
  deactivatePluginMainMock.mockResolvedValue(undefined);
  reportPluginRuntimeErrorMock.mockImplementation(async (pluginId, message) => ({
    ...createGatedPluginInfo(true),
    id: pluginId,
    runtimeError: message ?? undefined
  }));
  setPluginEnabledMock.mockImplementation(async (pluginId, enabled) => ({
    ...createGatedPluginInfo(enabled),
    id: pluginId
  }));

  const createElement = vi.fn((tagName: string) => {
    if (tagName === 'div') {
      return { id: '', appendChild: vi.fn(), style: {} } as unknown as HTMLElement;
    }
    if (tagName !== 'webview') {
      throw new Error(`Unexpected tag: ${tagName}`);
    }
    const webview = {
      src: '',
      partition: '',
      remove: vi.fn(),
      style: {} as CSSStyleDeclaration,
      setAttribute: vi.fn((name: string, value: string) => {
        if (name === 'src') {
          createdWebviews.push({ remove: webview.remove, src: value });
          queueMicrotask(() => notifyAgentReady(GATED_PLUGIN_ID));
        }
      }),
      addEventListener: vi.fn()
    };
    Object.defineProperty(webview, 'src', {
      set(value: string) {
        createdWebviews.push({ remove: webview.remove, src: value });
        queueMicrotask(() => notifyAgentReady(GATED_PLUGIN_ID));
      },
      get() {
        return createdWebviews.at(-1)?.src ?? '';
      }
    });
    return webview as unknown as Electron.WebviewTag;
  });

  vi.stubGlobal('document', {
    createElement,
    body: { appendChild: vi.fn() },
    getElementById: vi.fn((id: string) => (id === 'plugin-agent-webviews' ? agentContainer : null)),
    documentElement: {
      getAttribute: vi.fn(() => null),
      setAttribute: vi.fn(),
      removeAttribute: vi.fn()
    }
  });

  vi.stubGlobal('window', {
    api: {
      listPlugins: listPluginsMock,
      activatePluginMain: activatePluginMainMock,
      deactivatePluginMain: deactivatePluginMainMock,
      reportPluginRuntimeError: reportPluginRuntimeErrorMock,
      setPluginEnabled: setPluginEnabledMock,
      getTheme: vi.fn(async () => 'system'),
      onPluginsAgentReady: vi.fn(() => () => {}),
      onPluginsAgentFailed: vi.fn(() => () => {})
    }
  });
});

afterEach(async () => {
  resetPluginLoaderForTests();
  await unloadAllPlugins();
  vi.unstubAllGlobals();
  clearPluginContributions(FAILED_PLUGIN_ID);
  clearPluginContributions(GATED_PLUGIN_ID);
});

describe('pluginLoader', () => {
  it('reloadPlugin does not mount agent webviews for disabled plugins', async () => {
    listPluginsMock.mockResolvedValue([createGatedPluginInfo(false)]);

    await reloadPlugin(GATED_PLUGIN_ID);

    expect(createdWebviews).toHaveLength(0);
  });

  it('reloadPlugin mounts an agent webview for enabled plugins', async () => {
    listPluginsMock.mockResolvedValue([createGatedPluginInfo(true)]);

    await reloadPlugin(GATED_PLUGIN_ID);

    expect(createdWebviews).toHaveLength(1);
    expect(createdWebviews[0]?.src).toContain(GATED_PLUGIN_ID);
    expect(reportPluginRuntimeErrorMock).toHaveBeenCalledWith(GATED_PLUGIN_ID, null);
  });

  it('normalizes dynamic import fetch failures to a stable message', () => {
    expect(
      normalizePluginActivationError(
        new Error('Failed to fetch dynamically imported module: blob:http://localhost/abc')
      )
    ).toBe('Failed to load plugin module.');
  });

  it('formatPluginActivationErrorDetails includes message, stack, and cause chain', () => {
    const rootCause = new Error('Unexpected token');
    const error = new Error('Renderer activate failed', { cause: rootCause });
    error.stack = 'Error: Renderer activate failed\n    at activate';

    const details = formatPluginActivationErrorDetails(error);

    expect(details).toContain('Renderer activate failed');
    expect(details).toContain('Caused by: Unexpected token');
  });

  it('unloadPlugin clears orphan contributions when the plugin is not loaded', async () => {
    registerSettingsSectionContribution(FAILED_PLUGIN_ID, {
      id: 'plugin:com.example.failed:general',
      title: 'Example',
      contributionId: 'general'
    });

    await unloadPlugin(FAILED_PLUGIN_ID);

    expect(
      getRegisteredSettingsSections().some((section) => section.pluginId === FAILED_PLUGIN_ID)
    ).toBe(false);
  });

  it('disposePartialRendererActivation clears contributions for one plugin', async () => {
    registerSettingsSectionContribution(FAILED_PLUGIN_ID, {
      id: 'plugin:com.example.failed:general',
      title: 'Example',
      contributionId: 'general'
    });

    await disposePartialRendererActivation(FAILED_PLUGIN_ID);

    expect(
      getRegisteredSettingsSections().some((section) => section.pluginId === FAILED_PLUGIN_ID)
    ).toBe(false);
  });

  it('markPluginForThemePrompt remains callable for host-side theme UX', () => {
    expect(() => markPluginForThemePrompt(GATED_PLUGIN_ID)).not.toThrow();
  });
});
