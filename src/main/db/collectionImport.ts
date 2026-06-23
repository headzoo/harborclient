import { defaultAuth } from '#/shared/auth';
import type { CollectionExport, ExportedRequest, Folder, SavedRequest } from '#/shared/types';
import { resolveImportUuid } from '#/main/db/uuid';

/**
 * Resolves a folder id from an exported request's folder_name using a name map.
 *
 * @param folderName - Folder name from the export row, if any.
 * @param folderIdByName - Map of folder name to local folder id.
 * @returns Local folder id, or null for collection root.
 */
export function resolveImportFolderId(
  folderName: string | null | undefined,
  folderIdByName: Map<string, number>
): number | null {
  if (folderName == null || !folderName.trim()) {
    return null;
  }
  return folderIdByName.get(folderName) ?? null;
}

/**
 * Builds a map of existing request uuid to local request id for upsert during import.
 *
 * @param requests - Requests already stored in the target collection.
 * @returns Map keyed by non-empty request uuid.
 */
export function buildRequestUuidIndex(requests: SavedRequest[]): Map<string, number> {
  const index = new Map<string, number>();
  for (const request of requests) {
    const uuid = request.uuid.trim();
    if (uuid) {
      index.set(uuid, request.id);
    }
  }
  return index;
}

/**
 * Builds a map of existing folder name to local folder id for upsert during import.
 *
 * @param folders - Folders already stored in the target collection.
 * @returns Map keyed by folder name.
 */
export function buildFolderNameIndex(folders: Folder[]): Map<string, number> {
  return new Map(folders.map((folder) => [folder.name, folder.id]));
}

/**
 * Returns the uuid to persist for an imported request row.
 *
 * @param request - Exported request row from a collection file.
 * @returns Resolved uuid string for insert or update.
 */
export function resolveImportedRequestUuid(request: ExportedRequest): string {
  return resolveImportUuid(request.uuid);
}

/**
 * Returns the uuid to persist for an imported collection payload.
 *
 * @param payload - Validated collection export.
 * @returns Resolved uuid string for insert.
 */
export function resolveImportedCollectionUuid(payload: CollectionExport): string {
  return resolveImportUuid(payload.uuid);
}

/**
 * Serializes request fields shared by insert and update during collection import.
 *
 * @param request - Exported request row.
 * @returns Tuple of bound values for SQL statements.
 */
export function serializeImportedRequestFields(request: ExportedRequest): {
  name: string;
  method: ExportedRequest['method'];
  url: string;
  headersJson: string;
  paramsJson: string;
  authJson: string;
  body: string;
  body_type: ExportedRequest['body_type'];
  pre_request_script: string;
  post_request_script: string;
  comment: string;
  sort_order: number;
  uuid: string;
} {
  return {
    name: request.name,
    method: request.method,
    url: request.url,
    headersJson: JSON.stringify(request.headers),
    paramsJson: JSON.stringify(request.params),
    authJson: JSON.stringify(request.auth ?? defaultAuth()),
    body: request.body,
    body_type: request.body_type,
    pre_request_script: request.pre_request_script,
    post_request_script: request.post_request_script,
    comment: request.comment,
    sort_order: request.sort_order,
    uuid: resolveImportedRequestUuid(request)
  };
}
