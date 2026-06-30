import { useAppSelector } from '#/renderer/src/store/hooks';
import { selectPluginModal } from '#/renderer/src/store/slices/modalsSlice';
import { PluginSurface } from '#/renderer/src/plugins/PluginSurface';
import type { JSX } from 'react';

/**
 * Full-window overlay hosting an isolated plugin modal webview at the application root.
 *
 * Plugin code paints its own backdrop and centered panel inside the guest document so
 * modals are not clipped by tiny header-actions or sidebar webviews.
 */
export function PluginModalOverlay(): JSX.Element | null {
  const pluginModal = useAppSelector(selectPluginModal);

  if (!pluginModal) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[1000]" data-plugin-modal-overlay="" aria-hidden={false}>
      <PluginSurface
        pluginId={pluginModal.pluginId}
        contributionId={pluginModal.contributionId}
        kind="modals"
        context={pluginModal.context}
        resizeMode="fill"
        className="h-full w-full"
        style={{ height: '100%' }}
      />
    </div>
  );
}
