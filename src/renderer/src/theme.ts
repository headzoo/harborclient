import type { ThemeSource } from '#/shared/types';

/**
 * Applies the renderer theme attribute on the document root so CSS overrides
 * can target high-contrast mode without relying on nativeTheme alone.
 *
 * @param theme - Persisted theme preference.
 */
export function applyThemeAttribute(theme: ThemeSource): void {
  if (theme === 'high-contrast') {
    document.documentElement.setAttribute('data-theme', 'high-contrast');
    return;
  }

  document.documentElement.removeAttribute('data-theme');
}
