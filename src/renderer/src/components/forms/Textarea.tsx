import { forwardRef, type JSX, type TextareaHTMLAttributes } from 'react';
import { mergeFieldClasses, type FieldVariant } from './classes';

interface Props extends TextareaHTMLAttributes<HTMLTextAreaElement> {
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
 * macOS-style multiline input with shared field styling presets.
 *
 * Forwards its ref to the underlying native textarea for focus APIs.
 */
export const Textarea = forwardRef<HTMLTextAreaElement, Props>(function Textarea(
  { variant = 'control', className, ...props },
  ref
): JSX.Element {
  return <textarea ref={ref} className={mergeFieldClasses(variant, className)} {...props} />;
});
