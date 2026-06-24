import { forwardRef, type JSX, type SelectHTMLAttributes } from 'react';
import { mergeFieldClasses, type FieldVariant } from './classes';

interface Props extends SelectHTMLAttributes<HTMLSelectElement> {
  /**
   * Base field styling preset.
   */
  variant?: FieldVariant;

  /**
   * Additional Tailwind classes merged after the variant preset.
   */
  className?: string;
}

/**
 * macOS-style select menu with shared field styling presets.
 *
 * Children should be plain `<option>` elements. Forwards its ref to the
 * underlying native select for programmatic access when needed.
 */
export const Select = forwardRef<HTMLSelectElement, Props>(function Select(
  { variant = 'control', className, children, ...props },
  ref
): JSX.Element {
  return (
    <select ref={ref} className={mergeFieldClasses(variant, className)} {...props}>
      {children}
    </select>
  );
});
