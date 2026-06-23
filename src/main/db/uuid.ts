import { randomUUID } from 'crypto';
import type {
  CollectionExport,
  EnvironmentExport,
  ExportedRequest,
  RequestExport
} from '#/shared/types';

/**
 * Generates a new RFC 4122 UUID v4 for a document.
 *
 * @returns A new unique identifier string.
 */
export function generateDocumentUuid(): string {
  return randomUUID();
}

/**
 * Returns the payload uuid when present, otherwise mints a new one.
 *
 * @param uuid - Optional uuid from an import or export payload.
 * @returns A non-empty uuid string.
 */
export function resolveImportUuid(uuid: string | undefined): string {
  return uuid?.trim() ? uuid.trim() : generateDocumentUuid();
}

/**
 * Returns a copy of a collection export with fresh uuids for the collection and every request.
 *
 * Used when the user chooses "Import as new copy" so future imports do not collide.
 *
 * @param data - Validated collection export payload.
 * @returns A shallow copy with new uuids assigned.
 */
export function mintFreshCollectionExportUuids(data: CollectionExport): CollectionExport {
  return {
    ...data,
    uuid: generateDocumentUuid(),
    requests: data.requests.map((request) => ({
      ...request,
      uuid: generateDocumentUuid()
    }))
  };
}

/**
 * Returns a copy of a single-request export with a fresh uuid.
 *
 * @param data - Validated request export payload.
 * @returns A shallow copy with a new uuid.
 */
export function mintFreshRequestExportUuid(data: RequestExport): RequestExport {
  return {
    ...data,
    uuid: generateDocumentUuid()
  };
}

/**
 * Returns a copy of an environment export with a fresh uuid.
 *
 * @param data - Validated environment export payload.
 * @returns A shallow copy with a new uuid.
 */
export function mintFreshEnvironmentExportUuid(data: EnvironmentExport): EnvironmentExport {
  return {
    ...data,
    uuid: generateDocumentUuid()
  };
}

/**
 * Returns a copy of an exported request row with a fresh uuid.
 *
 * @param request - Exported request row within a collection file.
 * @returns A shallow copy with a new uuid.
 */
export function mintFreshExportedRequestUuid(request: ExportedRequest): ExportedRequest {
  return {
    ...request,
    uuid: generateDocumentUuid()
  };
}
