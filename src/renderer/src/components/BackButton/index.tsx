import type { JSX } from 'react';
import { faAngleLeft } from '@fortawesome/free-solid-svg-icons';
import { Button } from '#/renderer/src/components/Button';
import { FaIcon } from '#/renderer/src/components/FaIcon';

interface Props {
  /**
   * Called when the user activates the back control.
   */
  onClick: () => void;

  /**
   * Visible button label.
   */
  label?: string;

  /**
   * Additional Tailwind classes merged onto the button element.
   */
  className?: string;
}

/**
 * Primary navigation control that returns to the previous Team Hub or settings view.
 *
 * @param onClick - Back navigation handler.
 * @param label - Visible label; defaults to "Back".
 * @param className - Extra classes appended after the preset.
 */
export function BackButton({ onClick, label = 'Back', className }: Props): JSX.Element {
  const buttonClassName = className
    ? `inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap ${className}`
    : 'inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap';

  return (
    <Button type="button" className={buttonClassName} onClick={onClick}>
      <FaIcon icon={faAngleLeft} />
      {label}
    </Button>
  );
}
