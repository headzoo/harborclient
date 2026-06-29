import { useEffect, useRef, useState, type CSSProperties, type JSX } from 'react';
import { buildPluginSurfaceUrl, type PluginContributionKind } from '#/shared/plugin/pluginSurface';

interface Props {
  /** Plugin manifest id. */
  pluginId: string;

  /** Manifest contributes.* id for the surface URL. */
  contributionId: string;

  /** Contribution bucket used by the view webview bootstrap. */
  kind: PluginContributionKind;

  /** Serialized context pushed to the surface webview. */
  context?: unknown;

  /** Optional CSS class applied to the webview element. */
  className?: string;

  /** Optional inline style applied to the webview element. */
  style?: CSSProperties;

  /** Minimum block size when auto-resizing is enabled. */
  minHeight?: number | string;
  /** Optional contribution sub-slot (content, headerActions, indicator). */
  slot?: 'content' | 'headerActions' | 'indicator';
}

/**
 * Embeds one plugin UI contribution inside an isolated `<webview>` webContents.
 */
export function PluginSurface({
  pluginId,
  contributionId,
  kind,
  context,
  className,
  style,
  minHeight,
  slot = 'content'
}: Props): JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const src = buildPluginSurfaceUrl(pluginId, contributionId, kind, slot);

  /**
   * Creates the surface webview imperatively so `src` is set before attach.
   *
   * React-rendered `<webview>` elements attach with an empty src first; the main
   * process `will-attach-webview` handler rejects that attach.
   */
  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    setLoadError(null);
    const webview = document.createElement('webview') as Electron.WebviewTag;
    webview.partition = `persist:plugin-${pluginId}`;
    webview.setAttribute('allowpopups', 'false');
    webview.src = src;
    webview.className = className ?? '';
    Object.assign(webview.style, {
      display: 'flex',
      flex: '1',
      width: '100%',
      minHeight: minHeight != null ? String(minHeight) : undefined,
      border: 'none',
      background: 'transparent',
      ...(style as Record<string, string | undefined>)
    });

    const pushContext = (): void => {
      void window.api.pushPluginViewContext({
        pluginId,
        contributionId,
        kind,
        context: context ?? null
      });
    };

    const handleFailLoad = (event: Electron.DidFailLoadEvent): void => {
      if (!event.isMainFrame) {
        return;
      }
      setLoadError(event.errorDescription || 'Plugin surface failed to load.');
    };

    const handleDomReady = (): void => {
      pushContext();
    };

    webview.addEventListener('dom-ready', handleDomReady);
    webview.addEventListener('did-fail-load', handleFailLoad);
    container.appendChild(webview);

    return () => {
      webview.removeEventListener('dom-ready', handleDomReady);
      webview.removeEventListener('did-fail-load', handleFailLoad);
      webview.remove();
    };
  }, [pluginId, contributionId, kind, src, className, minHeight, style]);

  /**
   * Pushes updated context when props change without remounting the webview.
   */
  useEffect(() => {
    void window.api.pushPluginViewContext({
      pluginId,
      contributionId,
      kind,
      context: context ?? null
    });
  }, [pluginId, contributionId, kind, context]);

  if (loadError) {
    return (
      <p className="text-[14px] text-danger" role="alert">
        {loadError}
      </p>
    );
  }

  return (
    <div
      ref={containerRef}
      className={className}
      style={{
        display: 'flex',
        flex: 1,
        width: '100%',
        minHeight,
        ...style
      }}
    />
  );
}
