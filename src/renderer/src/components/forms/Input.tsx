import { forwardRef, type InputHTMLAttributes, type JSX } from 'react';
import { mergeFieldClasses, type FieldVariant } from './classes';

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  /**
   * Base field styling preset. Checkbox and radio inputs default to `plain`.
   */
  variant?: FieldVariant;

  /**
   * Additional Tailwind classes merged after the variant preset.
   */
  className?: string;
}

/**
 * macOS-style text and choice input with shared field styling presets.
 *
 * Forwards its ref to the underlying native input for focus and selection APIs.
 */
export const Input = forwardRef<HTMLInputElement, Props>(function Input(
  { variant = 'control', type, className, ...props },
  ref
): JSX.Element {
  const resolvedVariant = type === 'checkbox' || type === 'radio' ? 'plain' : variant;

  return (
    <input
      ref={ref}
      type={type}
      className={mergeFieldClasses(resolvedVariant, className)}
      {...props}
    />
  );
});
