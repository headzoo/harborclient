import type { JSX } from 'react';
import { FaIcon } from '#/renderer/src/components/FaIcon';
import { faChevronRight } from '#/renderer/src/fontawesome';

interface Props {
  /**
   * Collection segment for the breadcrumb.
   */
  collectionName?: string;

  /**
   * Folder segment for the breadcrumb.
   */
  folderName?: string;

  /**
   * When true, uses compact separators for inline edit mode.
   */
  compact?: boolean;
}

/**
 * Renders collection and optional folder breadcrumb segments.
 */
export function BreadcrumbPrefix({
  collectionName,
  folderName,
  compact = false
}: Props): JSX.Element | null {
  if (!collectionName && !folderName) return null;

  const segmentClass = compact
    ? 'truncate text-[15px] font-normal text-muted'
    : 'truncate font-normal text-muted';
  const separator = (
    <FaIcon
      icon={faChevronRight}
      className="inline-block h-3 w-3 shrink-0 align-middle text-muted"
    />
  );

  return (
    <span className="inline-flex min-w-0 shrink items-center gap-1 overflow-hidden">
      {collectionName && (
        <>
          <span className={segmentClass}>{collectionName}</span>
          {separator}
        </>
      )}
      {folderName && (
        <>
          <span className={segmentClass}>{folderName}</span>
          {separator}
        </>
      )}
    </span>
  );
}
