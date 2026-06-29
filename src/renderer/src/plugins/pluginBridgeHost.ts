import type {
  RegisteredCollectionSettingsTab,
  RegisteredContextMenuItem,
  RegisteredFooterPanel,
  RegisteredMainView,
  RegisteredMenuItem,
  RegisteredRequestTab,
  RegisteredRequestToolbarAction,
  RegisteredResponseTab,
  RegisteredSettingsSection,
  RegisteredSidebarPanel,
  RegisteredSidebarSection,
  RegisteredStatusBarItem
} from '#/shared/plugin/types';
import {
  registerCollectionSettingsTabContribution,
  registerContextMenuItemContribution,
  registerFooterPanelContribution,
  registerMainViewContribution,
  registerMenuItemContribution,
  registerRequestTabContribution,
  registerRequestToolbarActionContribution,
  registerResponseTabContribution,
  registerSettingsSectionContribution,
  registerSidebarPanelContribution,
  registerSidebarSectionContribution,
  registerStatusBarItemContribution,
  unregisterContribution
} from '#/renderer/src/plugins/registry';
import { executeHostPluginCommand } from '#/renderer/src/plugins/hostCommands';
import {
  createCollectionFromPlugin,
  getCollectionMetadataForPlugin,
  listCollectionRequestsForPlugin,
  loadSavedRequest,
  clearActiveResponse,
  logRequestToConsole,
  openRequestDraft,
  sendHttpRequestForPlugin,
  triggerSendRequest,
  type PluginConsoleLogPayload
} from '#/renderer/src/plugins/hostRequestCommands';
import {
  createEnvironmentWithVariables,
  updateEnvironmentVariables
} from '#/renderer/src/plugins/hostEnvironmentCommands';
import toast from 'react-hot-toast';

type ContributionKind =
  | 'settingsSections'
  | 'sidebarPanels'
  | 'sidebarSections'
  | 'mainViews'
  | 'requestTabs'
  | 'responseTabs'
  | 'collectionSettingsTabs'
  | 'footerPanels'
  | 'statusBarItems'
  | 'menuItems'
  | 'requestToolbarActions'
  | 'contextMenuItems';

interface ContributionMessage {
  pluginId: string;
  op: 'registerContribution' | 'unregisterContribution';
  kind?: ContributionKind;
  contribution?: Record<string, unknown>;
  contributionId?: string;
}

interface HostBridgeMessage {
  pluginId: string;
  op: string;
  payload?: unknown;
}

/**
 * Applies one contribution register/unregister message from a plugin agent webview.
 *
 * @param message - Contribution sync payload from the main-process broker.
 */
export function applyContributionMessage(message: ContributionMessage): void {
  if (message.op === 'unregisterContribution') {
    if (message.kind && message.contributionId) {
      unregisterContribution(message.pluginId, message.kind, message.contributionId);
    }
    return;
  }

  const kind = message.kind;
  const contribution = message.contribution;
  if (!kind || !contribution) {
    return;
  }

  switch (kind) {
    case 'settingsSections':
      registerSettingsSectionContribution(
        message.pluginId,
        contribution as Omit<RegisteredSettingsSection, 'pluginId'>
      );
      break;
    case 'sidebarPanels':
      registerSidebarPanelContribution(
        message.pluginId,
        contribution as Omit<RegisteredSidebarPanel, 'pluginId'>
      );
      break;
    case 'sidebarSections':
      registerSidebarSectionContribution(
        message.pluginId,
        contribution as Omit<RegisteredSidebarSection, 'pluginId'>
      );
      break;
    case 'mainViews':
      registerMainViewContribution(
        message.pluginId,
        contribution as Omit<RegisteredMainView, 'pluginId'>
      );
      break;
    case 'requestTabs':
      registerRequestTabContribution(
        message.pluginId,
        contribution as Omit<RegisteredRequestTab, 'pluginId'>
      );
      break;
    case 'responseTabs':
      registerResponseTabContribution(
        message.pluginId,
        contribution as Omit<RegisteredResponseTab, 'pluginId'>
      );
      break;
    case 'collectionSettingsTabs':
      registerCollectionSettingsTabContribution(
        message.pluginId,
        contribution as Omit<RegisteredCollectionSettingsTab, 'pluginId'>
      );
      break;
    case 'footerPanels':
      registerFooterPanelContribution(
        message.pluginId,
        contribution as Omit<RegisteredFooterPanel, 'pluginId'>
      );
      break;
    case 'statusBarItems':
      registerStatusBarItemContribution(
        message.pluginId,
        contribution as Omit<RegisteredStatusBarItem, 'pluginId'>
      );
      break;
    case 'menuItems':
      registerMenuItemContribution(
        message.pluginId,
        contribution as Omit<RegisteredMenuItem, 'pluginId'>
      );
      break;
    case 'requestToolbarActions':
      registerRequestToolbarActionContribution(
        message.pluginId,
        contribution as Omit<RegisteredRequestToolbarAction, 'pluginId'>
      );
      break;
    case 'contextMenuItems':
      registerContextMenuItemContribution(
        message.pluginId,
        contribution as Omit<RegisteredContextMenuItem, 'pluginId'>
      );
      break;
    default:
      break;
  }
}

/**
 * Handles host-side operations requested by isolated plugin webviews.
 *
 * @param message - Host bridge payload from the main-process broker.
 */
export async function handlePluginHostBridge(message: HostBridgeMessage): Promise<void> {
  const { pluginId, op, payload } = message;

  switch (op) {
    case 'ui.showToast': {
      const { message: text, options } = payload as {
        message: string;
        options?: { duration?: number };
      };
      toast(text, { duration: options?.duration ?? 2000 });
      return;
    }
    case 'commands.execute': {
      const {
        pluginId: targetPluginId,
        commandId,
        args
      } = payload as {
        pluginId?: string;
        commandId: string;
        args?: unknown[];
      };
      const ownerId = targetPluginId ?? pluginId;
      if (ownerId === 'harborclient') {
        await executeHostPluginCommand(commandId, ...(args ?? []));
        return;
      }
      await window.api.executePluginAgentCommand(ownerId, commandId, args ?? []);
      return;
    }
    case 'host.openRequestDraft':
      await openRequestDraft((payload as { payload: never }).payload);
      return;
    case 'host.loadRequest':
      loadSavedRequest((payload as { requestId: number }).requestId);
      return;
    case 'host.sendRequest':
      triggerSendRequest();
      return;
    case 'host.createEnvironmentWithVariables': {
      const { name, variables } = payload as {
        name: string;
        variables: Parameters<typeof createEnvironmentWithVariables>[1];
      };
      await createEnvironmentWithVariables(name, variables);
      return;
    }
    case 'host.updateEnvironmentVariables': {
      const { environmentId, variables } = payload as {
        environmentId: number;
        variables: Parameters<typeof updateEnvironmentVariables>[1];
      };
      await updateEnvironmentVariables(environmentId, variables);
      return;
    }
    case 'host.createCollection':
      await createCollectionFromPlugin((payload as { payload: never }).payload);
      return;
    case 'host.listCollectionRequests': {
      const { collectionId, folderId } = payload as {
        collectionId: number;
        folderId?: number | null;
      };
      await listCollectionRequestsForPlugin(collectionId, folderId);
      return;
    }
    case 'host.getCollectionMetadata': {
      const { collectionId } = payload as { collectionId: number };
      await getCollectionMetadataForPlugin(collectionId);
      return;
    }
    case 'host.logRequestToConsole':
      logRequestToConsole((payload as { payload: PluginConsoleLogPayload }).payload);
      return;
    case 'host.sendHttpRequest':
      await sendHttpRequestForPlugin((payload as { input: never }).input);
      return;
    case 'host.clearResponse':
      clearActiveResponse();
      return;
    default:
      return;
  }
}

/**
 * Subscribes to plugin broker events routed through the preload bridge.
 */
export function startPluginBridgeHost(): () => void {
  const unsubContributions = window.api.onPluginsContributions((message) => {
    applyContributionMessage(message as ContributionMessage);
  });
  const unsubHostBridge = window.api.onPluginsHostBridge((message) => {
    void handlePluginHostBridge(message as HostBridgeMessage);
  });
  return () => {
    unsubContributions();
    unsubHostBridge();
  };
}
