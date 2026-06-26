import type { JSX } from 'react';
import { Button } from '#/renderer/src/components/Button';

interface Props {
  /**
   * Closes the sharing keys overlay.
   */
  onClose: () => void;
}

/**
 * Primary Close control for sharing keys section headers.
 */
export function SharingKeysCloseButton({ onClose }: Props): JSX.Element {
  return (
    <Button
      type="button"
      className="shrink-0 whitespace-nowrap"
      aria-label="Close sharing keys"
      onClick={onClose}
    >
      Close
    </Button>
  );
}
