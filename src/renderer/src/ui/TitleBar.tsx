import type { JSX } from 'react';

const isMac = window.platform === 'darwin';

/**
 * macOS title bar drag region for hidden-inset window chrome.
 */
export function TitleBar(): JSX.Element | null {
  if (!isMac) return null;

  return <div className="app-drag h-[52px] shrink-0" aria-hidden="true" />;
}
