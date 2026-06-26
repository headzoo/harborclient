import type { JSX } from 'react';
import { Button } from '#/renderer/src/components/Button';

interface Props {
  /**
   * Closes the settings overlay.
   */
  onClose: () => void;
}

/**
 * Primary Close control for settings section headers.
 */
export function SettingsCloseButton({ onClose }: Props): JSX.Element {
  return (
    <Button
      type="button"
      className="shrink-0 whitespace-nowrap"
      aria-label="Close settings"
      onClick={onClose}
    >
      Close
    </Button>
  );
}
