import type { JSX } from 'react';
import { Button } from '#/renderer/src/components/Button';
import { FaIcon } from '#/renderer/src/components/FaIcon';
import { faXmark } from '#/renderer/src/fontawesome';

interface Props {
  /**
   * Called when the user closes the panel or overlay.
   */
  onClose: () => void;

  /**
   * Default accessible name when `ariaLabel` is not provided.
   */
  label?: string;

  /**
   * Accessible name when it should differ from `label`.
   */
  ariaLabel?: string;

  /**
   * Additional Tailwind classes merged onto the button element.
   */
  className?: string;
}

/**
 * Secondary icon close control for settings headers and full-page panels.
 *
 * @param onClose - Close handler.
 * @param label - Default accessible name; defaults to "Close".
 * @param ariaLabel - Accessible name override.
 * @param className - Extra classes appended after the layout preset.
 */
export function PanelCloseButton({
  onClose,
  label = 'Close',
  ariaLabel,
  className
}: Props): JSX.Element {
  const base = 'inline-flex shrink-0 items-center justify-center py-2';
  const classes = className ? `${base} ${className}` : base;

  return (
    <Button
      type="button"
      variant="secondary"
      className={classes}
      aria-label={ariaLabel ?? label}
      onClick={onClose}
    >
      <FaIcon icon={faXmark} className="h-4 w-4" />
    </Button>
  );
}
