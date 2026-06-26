import type { JSX, ReactNode } from 'react';

/**
 * Layout preset for label and control placement within a form group.
 */
export type FormGroupLayout =
  | 'stacked'
  | 'checkbox'
  | 'inline'
  | 'radio'
  | 'checkboxAdjacent'
  | 'associated';

/**
 * Label color tone for form group headings.
 */
export type FormGroupLabelTone = 'default' | 'muted';

interface Props {
  /**
   * Visible label text, or screen-reader-only text when `srOnly` is set.
   */
  label: ReactNode;

  /**
   * Form control(s) rendered inside or beside the label. Omitted for `associated` layout.
   */
  children?: ReactNode;

  /**
   * Associates the label with a control via `htmlFor`.
   */
  htmlFor?: string;

  /**
   * Muted helper text rendered below the control (stacked layout only).
   */
  description?: ReactNode;

  /**
   * Label and control placement. Defaults to stacked (label above control).
   */
  layout?: FormGroupLayout;

  /**
   * Label color style. Defaults to prominent `text-text`.
   */
  labelTone?: FormGroupLabelTone;

  /**
   * Hides the label visually while keeping it available to screen readers.
   */
  srOnly?: boolean;

  /**
   * Additional Tailwind classes on the outer wrapper.
   */
  className?: string;

  /**
   * Extra classes on the label element (associated and checkboxAdjacent layouts).
   */
  labelClassName?: string;
}

/**
 * Returns Tailwind classes for the label text based on tone and visibility.
 *
 * @param tone - Label color preset.
 * @param srOnly - Whether the label is visually hidden.
 * @param inline - Whether the label sits beside the control in a row.
 * @returns Class string for the label element.
 */
function labelClasses(tone: FormGroupLabelTone, srOnly: boolean, inline: boolean): string {
  const base = 'text-[14px]';
  const visibility = srOnly ? 'sr-only' : '';
  if (inline) {
    const color = tone === 'muted' ? 'shrink-0 text-muted' : 'shrink-0 font-medium text-text';
    return `${base} ${color} ${visibility}`.trim();
  }
  const color = tone === 'muted' ? 'text-muted' : 'font-medium text-text';
  return `${base} ${color} ${visibility}`.trim();
}

/**
 * Reusable form field wrapper that pairs a label with one or more controls.
 * Supports stacked fields, checkboxes, inline rows, radio options, and
 * adjacent checkbox rows used in list pickers.
 *
 * @param label - Field label text.
 * @param children - Input, select, or composite control content.
 * @param htmlFor - ID of the primary associated control.
 * @param description - Optional helper text below the control.
 * @param layout - Label/control placement preset.
 * @param labelTone - Label color style.
 * @param srOnly - Hide label visually for screen-reader-only labels.
 * @param className - Extra classes on the outer wrapper.
 * @param labelClassName - Extra classes on the label element.
 */
export function FormGroup({
  label,
  children,
  htmlFor,
  description,
  layout = 'stacked',
  labelTone = 'default',
  srOnly = false,
  className,
  labelClassName
}: Props): JSX.Element {
  const extra = className ?? '';

  if (layout === 'associated') {
    const associatedClasses = labelClassName ?? 'text-[14px] text-text';
    return (
      <label htmlFor={htmlFor} className={associatedClasses}>
        {label}
      </label>
    );
  }

  if (layout === 'checkboxAdjacent') {
    const wrapperClasses = extra ? `flex items-start gap-2 ${extra}` : 'flex items-start gap-2';
    const adjacentLabelClasses = labelClassName ?? 'min-w-0 flex-1 text-[14px] text-text';
    return (
      <div className={wrapperClasses}>
        {children}
        <label htmlFor={htmlFor} className={adjacentLabelClasses}>
          {label}
        </label>
      </div>
    );
  }

  if (layout === 'radio') {
    const wrapperClasses = extra
      ? `inline-flex cursor-pointer items-center gap-1.5 text-[14px] text-text app-no-drag ${extra}`
      : 'inline-flex cursor-pointer items-center gap-1.5 text-[14px] text-text app-no-drag';
    return (
      <label htmlFor={htmlFor} className={wrapperClasses}>
        {children}
        {label}
      </label>
    );
  }

  if (layout === 'checkbox') {
    const wrapperClasses = extra ? `flex items-center gap-2 ${extra}` : 'flex items-center gap-2';
    return (
      <label htmlFor={htmlFor} className={wrapperClasses}>
        {children}
        <span className={labelClasses(labelTone, srOnly, false)}>{label}</span>
      </label>
    );
  }

  if (layout === 'inline') {
    const wrapperClasses = extra
      ? `flex min-w-0 flex-1 items-center gap-2 ${extra}`
      : 'flex min-w-0 flex-1 items-center gap-2';
    return (
      <label htmlFor={htmlFor} className={wrapperClasses}>
        <span className={labelClasses(labelTone, srOnly, true)}>{label}</span>
        {children}
      </label>
    );
  }

  const wrapperClasses = extra ? `flex flex-col gap-1 ${extra}` : 'flex flex-col gap-1';
  return (
    <label htmlFor={htmlFor} className={wrapperClasses}>
      <span className={labelClasses(labelTone, srOnly, false)}>{label}</span>
      {children}
      {description != null && description !== '' ? (
        <p className="m-0 text-[14px] text-muted">{description}</p>
      ) : null}
    </label>
  );
}
