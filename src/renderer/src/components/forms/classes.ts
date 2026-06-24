/**
 * Shared Tailwind class strings for macOS-style form controls.
 */

/**
 * Visual style preset for form field wrappers.
 */
export type FieldVariant = 'control' | 'surface' | 'plain';

/**
 * Border and subtle tint shell for composite inputs (e.g. VariableInput wrappers).
 */
export const fieldFrame = 'overflow-hidden rounded-md border border-separator bg-field';

/** Inset control style for standard settings and editor fields. */
export const field =
  'rounded-md border border-separator bg-field px-2 py-1 text-[15px] text-text app-no-drag';

/** Surface style for modal and Team Hub form fields. */
export const surfaceField =
  'w-full rounded-md border border-separator bg-field px-3 py-2 text-[14px] text-text';

const VARIANT_CLASSES: Record<Exclude<FieldVariant, 'plain'>, string> = {
  control: field,
  surface: surfaceField
};

/**
 * Merges a field variant preset with optional caller classes.
 *
 * @param variant - Base styling preset; `plain` applies no preset classes.
 * @param className - Additional Tailwind classes appended after the preset.
 * @returns Combined class string, or undefined when both inputs are empty.
 */
export function mergeFieldClasses(variant: FieldVariant, className?: string): string | undefined {
  const base = variant === 'plain' ? '' : VARIANT_CLASSES[variant];
  if (base && className) return `${base} ${className}`;
  if (base) return base;
  if (className) return className;
  return undefined;
}
