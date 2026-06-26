import type { JSX } from 'react';
import { Button } from '#/renderer/src/components/Button';
import { FaIcon } from '#/renderer/src/components/FaIcon';
import { faAngleLeft } from '#/renderer/src/fontawesome';

interface Props {
  /**
   * Called when the user activates the back control.
   */
  onClick: () => void;

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
 * Secondary icon back control for nested panel headers.
 *
 * Matches {@link PanelCloseButton} styling with a left-angle icon instead of close.
 *
 * @param onClick - Back navigation handler.
 * @param label - Default accessible name; defaults to "Back".
 * @param ariaLabel - Accessible name override.
 * @param className - Extra classes appended after the layout preset.
 */
export function BackButton({ onClick, label = 'Back', ariaLabel, className }: Props): JSX.Element {
  const base = 'inline-flex shrink-0 items-center justify-center py-2';
  const classes = className ? `${base} ${className}` : base;

  return (
    <Button
      type="button"
      variant="secondary"
      className={classes}
      aria-label={ariaLabel ?? label}
      onClick={onClick}
    >
      <FaIcon icon={faAngleLeft} className="h-4 w-4" />
    </Button>
  );
}
