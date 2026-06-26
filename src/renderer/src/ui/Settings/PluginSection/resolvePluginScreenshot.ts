import type { PluginCatalogEntry } from '#/shared/plugin/catalog';
import type { PluginGitPreview, PluginInfo } from '#/shared/plugin/types';
import { buildGitHubRawContentUrl } from '#/shared/plugin/githubRaw';

/**
 * Returns the repository-relative path from a manifest screenshot entry.
 *
 * @param screenshot - Manifest screenshot string or object.
 */
function screenshotRelativePath(
  screenshot: NonNullable<PluginInfo['manifest']['screenshots']>[number]
): string {
  return typeof screenshot === 'string' ? screenshot : screenshot.path;
}

/**
 * Builds a data URL from a plugin asset read over IPC.
 *
 * @param asset - Base64 asset payload from the main process.
 * @returns Data URL suitable for `<img src>`.
 */
export function pluginAssetToDataUrl(asset: { content: string; mimeType: string }): string {
  return `data:${asset.mimeType};base64,${asset.content}`;
}

/**
 * Loads the best available screenshot for an installed plugin.
 *
 * Manifest assets on disk take priority, then catalog URLs, then GitHub raw fallbacks.
 *
 * @param plugin - Installed plugin row.
 * @param catalogScreenshot - Optional marketplace screenshot URL for this plugin id.
 * @returns Resolved screenshot URL/data URL, or undefined when unavailable.
 */
export async function loadInstalledPluginScreenshotSrc(
  plugin: PluginInfo,
  catalogScreenshot?: string
): Promise<string | undefined> {
  const manifestScreenshot = plugin.manifest.screenshots?.[0];
  if (manifestScreenshot) {
    const relativePath = screenshotRelativePath(manifestScreenshot);
    try {
      const asset = await window.api.readPluginAsset(plugin.id, relativePath);
      return pluginAssetToDataUrl(asset);
    } catch {
      const repoUrl = plugin.repoUrl;
      const ref = plugin.repoRef ?? 'main';
      if (repoUrl) {
        const rawUrl = buildGitHubRawContentUrl(repoUrl, ref, relativePath);
        if (rawUrl) {
          return rawUrl;
        }
      }
    }
  }

  if (catalogScreenshot) {
    return catalogScreenshot;
  }

  const repoUrl = plugin.repoUrl;
  const ref = plugin.repoRef ?? 'main';
  if (repoUrl) {
    return buildGitHubRawContentUrl(repoUrl, ref, 'screenshot.png') ?? undefined;
  }

  return undefined;
}

/**
 * Resolves the screenshot shown in a marketplace preview modal.
 *
 * @param entry - Marketplace listing.
 * @param preview - Remote preview payload when manifest fetch succeeded.
 * @returns Screenshot URL/data URL, or undefined when no preview image exists.
 */
export function resolveCatalogPluginScreenshotSrc(
  entry: PluginCatalogEntry,
  preview: PluginGitPreview | null
): string | undefined {
  return preview?.screenshotSrc ?? entry.screenshot;
}
