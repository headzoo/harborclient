import MiniSearch from 'minisearch';
import type { Collection, Environment, Folder, SavedRequest } from '#/shared/types';

/**
 * Sidebar entities passed from the renderer for indexing and filtering.
 */
export interface SidebarSearchInput {
  /**
   * Collections in sidebar display order.
   */
  collections: Collection[];

  /**
   * Folders grouped by collection id; omitted keys mean contents not loaded yet.
   */
  foldersByCollection: Record<number, Folder[]>;

  /**
   * Saved requests grouped by collection id; omitted keys mean contents not loaded yet.
   */
  requestsByCollection: Record<number, SavedRequest[]>;

  /**
   * Environments in sidebar display order.
   */
  environments: Environment[];
}

/**
 * Visibility sets used to filter the collections tree and environments list.
 */
export interface SidebarSearchFilter {
  /**
   * Collection rows to show in the sidebar tree.
   */
  collectionIds: ReadonlySet<number>;

  /**
   * Folder rows to show within visible collections.
   */
  folderIds: ReadonlySet<number>;

  /**
   * Request rows to show within visible collections and folders.
   */
  requestIds: ReadonlySet<number>;

  /**
   * Environment rows to show in the environments section.
   */
  environmentIds: ReadonlySet<number>;
}

/**
 * Indexed fields for sidebar entity search.
 */
type SidebarSearchDocument = {
  id: string;
  name: string;
  url?: string;
  method?: string;
};

/**
 * Builds a composite document id for one sidebar entity kind.
 *
 * @param kind - Entity category.
 * @param entityId - Numeric database id.
 */
function sidebarDocumentId(
  kind: 'collection' | 'folder' | 'request' | 'environment',
  entityId: number
): string {
  return `${kind}:${entityId}`;
}

/**
 * Parses a composite sidebar document id into kind and numeric id.
 *
 * @param documentId - Composite id stored in the search index.
 */
function parseSidebarDocumentId(documentId: string): {
  kind: 'collection' | 'folder' | 'request' | 'environment';
  entityId: number;
} | null {
  const match = /^(collection|folder|request|environment):(\d+)$/.exec(documentId);
  if (!match) {
    return null;
  }
  return {
    kind: match[1] as 'collection' | 'folder' | 'request' | 'environment',
    entityId: Number(match[2])
  };
}

/**
 * Builds a MiniSearch index over collections, folders, requests, and environments.
 *
 * @param input - Sidebar data currently available in the renderer store.
 * @returns Search index keyed by composite entity ids.
 */
export function buildSidebarSearchIndex(
  input: SidebarSearchInput
): MiniSearch<SidebarSearchDocument> {
  const index = new MiniSearch<SidebarSearchDocument>({
    fields: ['name', 'url', 'method'],
    storeFields: ['id'],
    searchOptions: {
      prefix: true,
      fuzzy: 0.2,
      combineWith: 'AND'
    }
  });

  const documents: SidebarSearchDocument[] = [];

  for (const collection of input.collections) {
    documents.push({
      id: sidebarDocumentId('collection', collection.id),
      name: collection.name
    });
  }

  for (const environment of input.environments) {
    documents.push({
      id: sidebarDocumentId('environment', environment.id),
      name: environment.name
    });
  }

  for (const collection of input.collections) {
    const folders = input.foldersByCollection[collection.id];
    if (folders == null) {
      continue;
    }

    for (const folder of folders) {
      documents.push({
        id: sidebarDocumentId('folder', folder.id),
        name: folder.name
      });
    }

    const requests = input.requestsByCollection[collection.id];
    if (requests == null) {
      continue;
    }

    for (const request of requests) {
      documents.push({
        id: sidebarDocumentId('request', request.id),
        name: request.name,
        url: request.url,
        method: request.method
      });
    }
  }

  index.addAll(documents);
  return index;
}

/**
 * Computes hierarchical visibility sets from direct MiniSearch hits.
 *
 * @param input - Sidebar data used to resolve parent/child relationships.
 * @param hits - Parsed direct search hits by entity kind.
 */
function buildSidebarSearchFilter(
  input: SidebarSearchInput,
  hits: {
    collections: Set<number>;
    folders: Set<number>;
    requests: Set<number>;
    environments: Set<number>;
  }
): SidebarSearchFilter {
  const collectionIds = new Set<number>();
  const folderIds = new Set<number>();
  const requestIds = new Set<number>();
  const environmentIds = new Set<number>(hits.environments);

  const folderById = new Map<number, Folder>();
  const requestById = new Map<number, SavedRequest>();

  for (const collection of input.collections) {
    for (const folder of input.foldersByCollection[collection.id] ?? []) {
      folderById.set(folder.id, folder);
    }
    for (const request of input.requestsByCollection[collection.id] ?? []) {
      requestById.set(request.id, request);
    }
  }

  for (const requestId of hits.requests) {
    const request = requestById.get(requestId);
    if (request == null) {
      continue;
    }
    requestIds.add(request.id);
    collectionIds.add(request.collection_id);
    if (request.folder_id != null) {
      folderIds.add(request.folder_id);
    }
  }

  for (const folderId of hits.folders) {
    const folder = folderById.get(folderId);
    if (folder == null) {
      continue;
    }
    folderIds.add(folder.id);
    collectionIds.add(folder.collection_id);
    for (const request of input.requestsByCollection[folder.collection_id] ?? []) {
      if (request.folder_id === folder.id) {
        requestIds.add(request.id);
      }
    }
  }

  for (const collectionId of hits.collections) {
    collectionIds.add(collectionId);
    for (const folder of input.foldersByCollection[collectionId] ?? []) {
      folderIds.add(folder.id);
    }
    for (const request of input.requestsByCollection[collectionId] ?? []) {
      requestIds.add(request.id);
    }
  }

  return {
    collectionIds,
    folderIds,
    requestIds,
    environmentIds
  };
}

/**
 * Filters sidebar entities by a user query using the prebuilt search index.
 *
 * @param input - Sidebar data currently available in the renderer store.
 * @param index - MiniSearch index built from the same sidebar rows.
 * @param query - Raw search text from the sidebar search field.
 * @returns Visibility sets for tree filtering, or null when the query is empty.
 */
export function searchSidebar(
  input: SidebarSearchInput,
  index: MiniSearch<SidebarSearchDocument>,
  query: string
): SidebarSearchFilter | null {
  const trimmed = query.trim();
  if (!trimmed) {
    return null;
  }

  const hits = {
    collections: new Set<number>(),
    folders: new Set<number>(),
    requests: new Set<number>(),
    environments: new Set<number>()
  };

  for (const result of index.search(trimmed)) {
    const parsed = parseSidebarDocumentId(String(result.id));
    if (parsed == null) {
      continue;
    }
    switch (parsed.kind) {
      case 'collection':
        hits.collections.add(parsed.entityId);
        break;
      case 'folder':
        hits.folders.add(parsed.entityId);
        break;
      case 'request':
        hits.requests.add(parsed.entityId);
        break;
      case 'environment':
        hits.environments.add(parsed.entityId);
        break;
    }
  }

  return buildSidebarSearchFilter(input, hits);
}
