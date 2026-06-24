import type { ButtonHTMLAttributes, JSX } from 'react';

/**
 * Visual style for a macOS-style button.
 */
export type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'primaryDanger'
  | 'secondaryDanger'
  | 'toolbar'
  | 'icon'
  | 'iconDanger';

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary:
    'cursor-pointer rounded-md border border-transparent bg-accent px-3 py-1 text-[15px] font-medium text-white shadow-sm hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50 app-no-drag',
  secondary:
    'cursor-pointer rounded-md border border-separator bg-control px-3 py-1 text-[15px] text-text shadow-sm hover:bg-selection disabled:cursor-not-allowed disabled:opacity-50 app-no-drag',
  primaryDanger:
    'cursor-pointer rounded-md border border-transparent bg-danger px-3 py-1 text-[15px] font-medium text-white shadow-sm hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50 app-no-drag',
  secondaryDanger:
    'cursor-pointer rounded-md border border-separator bg-control px-3 py-1 text-[15px] text-danger shadow-sm hover:bg-danger/15 disabled:cursor-not-allowed disabled:opacity-50 app-no-drag',
  toolbar:
    'cursor-pointer rounded-md border-none bg-transparent px-2 py-1 text-[15px] hover:bg-selection app-no-drag',
  icon: 'inline-flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center rounded-md border-none bg-transparent text-muted opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 focus:opacity-100 focus-visible:opacity-100 hover:bg-selection hover:text-text app-no-drag',
  iconDanger:
    'inline-flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center rounded-md border-none bg-transparent text-muted opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 focus:opacity-100 focus-visible:opacity-100 hover:bg-danger/15 hover:text-danger app-no-drag'
};

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  /**
   * Visual style preset. Defaults to primary accent fill.
   */
  variant?: ButtonVariant;

  /**
   * Additional Tailwind classes merged after the variant preset.
   */
  className?: string;
}

/**
 * macOS-style button with shared variant presets for primary actions, secondary
 * actions, toolbar controls, and icon-only controls.
 *
 * Defaults to `type="button"` so clicks do not accidentally submit a parent form.
 * Pass `type="submit"` explicitly when submit behavior is intended.
 *
 * @param variant - Visual preset; defaults to `primary`.
 * @param className - Extra classes appended after the variant classes.
 * @param type - Native button type; defaults to `button`.
 */
export function Button({
  variant = 'primary',
  className,
  type = 'button',
  ...props
}: Props): JSX.Element {
  const classes = className ? `${VARIANT_CLASSES[variant]} ${className}` : VARIANT_CLASSES[variant];
  return <button type={type} className={classes} {...props} />;
}
