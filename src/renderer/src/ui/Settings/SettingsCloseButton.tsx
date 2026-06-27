import { PanelCloseButton } from '@harborclient/sdk/components';
import type { JSX } from 'react';

interface Props {
  /**
   * Closes the settings overlay.
   */
  onClose: () => void;
}

/**
 * Secondary icon close control for settings section headers.
 */
export function SettingsCloseButton({ onClose }: Props): JSX.Element {
  return <PanelCloseButton onClose={onClose} ariaLabel="Close settings" />;
}
