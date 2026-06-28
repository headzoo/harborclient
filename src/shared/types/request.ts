import type { AuthConfig } from '#/shared/auth';
import type { BodyType, HttpMethod, KeyValue } from '#/shared/types/common';

/**
 * A saved HTTP request belonging to a collection.
 */
export interface SavedRequest {
  /**
   * Unique database ID.
   */
  id: number;

  /**
   * Stable portable identifier for export/import deduplication.
   */
  uuid: string;

  /**
   * ID of the collection this request belongs to.
   */
  collection_id: number;

  /**
   * Display name shown in the sidebar.
   */
  name: string;

  /**
   * HTTP method used for the request.
   */
  method: HttpMethod;

  /**
   * Request URL without query parameters.
   */
  url: string;

  /**
   * Request headers as editable key-value pairs.
   */
  headers: KeyValue[];

  /**
   * Query parameters as editable key-value pairs.
   */
  params: KeyValue[];

  /**
   * Authorization settings; none inherits collection auth at send time.
   */
  auth: AuthConfig;

  /**
   * Raw request body content.
   */
  body: string;

  /**
   * Content type of the request body.
   */
  body_type: BodyType;

  /**
   * JavaScript run before the request is sent.
   */
  pre_request_script: string;

  /**
   * JavaScript run after the response is received.
   */
  post_request_script: string;

  /**
   * Free-form notes for this request.
   */
  comment: string;

  /**
   * ID of the folder containing this request, or null when at collection root.
   */
  folder_id: number | null;

  /**
   * Position within the collection for sidebar ordering.
   */
  sort_order: number;

  /**
   * ISO 8601 timestamp when the request was created.
   */
  created_at: string;

  /**
   * ISO 8601 timestamp when the request was last saved.
   */
  updated_at: string;
}
/**
 * Portable single-request export file format.
 */
export interface RequestExport {
  /**
   * HarborClient export schema version for forward compatibility.
   */
  harborclientVersion: 1;

  /**
   * Discriminator identifying this file as a request export.
   */
  harborclientExport: 'request';

  /**
   * Stable portable identifier; omitted in legacy export files.
   */
  uuid?: string;

  /**
   * Display name for the saved request.
   */
  name: string;

  /**
   * HTTP method used for the request.
   */
  method: HttpMethod;

  /**
   * Request URL without query parameters.
   */
  url: string;

  /**
   * Request headers as editable key-value pairs.
   */
  headers: KeyValue[];

  /**
   * Query parameters as editable key-value pairs.
   */
  params: KeyValue[];

  /**
   * Authorization settings; none inherits collection auth at send time.
   */
  auth?: AuthConfig;

  /**
   * Raw request body content.
   */
  body: string;

  /**
   * Content type of the request body.
   */
  body_type: BodyType;

  /**
   * JavaScript run before the request is sent.
   */
  pre_request_script: string;

  /**
   * JavaScript run after the response is received.
   */
  post_request_script: string;

  /**
   * Free-form notes for this request.
   */
  comment: string;
}

/**
 * Input for creating or updating a saved request.
 */
export interface SaveRequestInput {
  /**
   * Existing request ID; omit to insert a new request.
   */
  id?: number;

  /**
   * Stable portable identifier; preserved on update, generated on insert when omitted.
   */
  uuid?: string;

  /**
   * ID of the collection to save the request in.
   */
  collection_id: number;

  /**
   * Display name for the saved request.
   */
  name: string;

  /**
   * HTTP method used for the request.
   */
  method: HttpMethod;

  /**
   * Request URL without query parameters.
   */
  url: string;

  /**
   * Request headers as editable key-value pairs.
   */
  headers: KeyValue[];

  /**
   * Query parameters as editable key-value pairs.
   */
  params: KeyValue[];

  /**
   * Authorization settings; none inherits collection auth at send time.
   */
  auth: AuthConfig;

  /**
   * Raw request body content.
   */
  body: string;

  /**
   * Content type of the request body.
   */
  body_type: BodyType;

  /**
   * JavaScript run before the request is sent.
   */
  pre_request_script: string;

  /**
   * JavaScript run after the response is received.
   */
  post_request_script: string;

  /**
   * Free-form notes for this request.
   */
  comment: string;

  /**
   * ID of the folder containing this request, or null when at collection root.
   */
  folder_id?: number | null;
}

/**
 * Input for sending an HTTP request from the renderer.
 */
export interface SendRequestInput {
  /**
   * HTTP method to use for the request.
   */
  method: HttpMethod;

  /**
   * Request URL without query parameters.
   */
  url: string;

  /**
   * Request headers as editable key-value pairs.
   */
  headers: KeyValue[];

  /**
   * Query parameters as editable key-value pairs.
   */
  params: KeyValue[];

  /**
   * Raw request body content.
   */
  body: string;

  /**
   * Content type of the request body.
   */
  bodyType: BodyType;

  /**
   * Saved collection request id when the send originated from a saved request tab.
   */
  sourceRequestId?: number;

  /**
   * Display name from the request tab when {@link sourceRequestId} is set.
   */
  sourceRequestName?: string;
}

/**
 * Metadata for the HTTP request as sent. Multipart {@link body} is a display
 * summary of form fields, not the raw wire payload.
 */
export interface SentRequest {
  /**
   * HTTP method used for the request.
   */
  method: HttpMethod;

  /**
   * Fully resolved request URL including query parameters.
   */
  url: string;

  /**
   * Request headers as a flat key-value map.
   */
  headers: Record<string, string>;

  /**
   * Body content for display. For multipart, a human-readable summary of form
   * fields and file names — not the raw multipart bytes. For other body types,
   * the literal string sent on the wire, or empty when none.
   */
  body: string;

  /**
   * Content type of the request body; used to interpret {@link body}.
   */
  bodyType?: BodyType;
}

/**
 * One hop in a redirect chain recorded while following 3xx responses.
 */
export interface RedirectHop {
  /**
   * Status code of the redirect response (301, 302, 303, 307, or 308).
   */
  status: number;

  /**
   * Status text of the redirect response.
   */
  statusText: string;

  /**
   * Absolute URL that was requested for this hop.
   */
  url: string;

  /**
   * Resolved absolute URL from the Location header.
   */
  location: string;

  /**
   * HTTP method used for this hop.
   */
  method: HttpMethod;
}

/**
 * Result of an HTTP request including timing and size metadata.
 */
export interface SendResult {
  /**
   * HTTP status code, or 0 when the request failed before a response.
   */
  status: number;

  /**
   * HTTP status text from the response.
   */
  statusText: string;

  /**
   * Response headers as a flat key-value map.
   */
  headers: Record<string, string>;

  /**
   * Response body as text.
   */
  body: string;

  /**
   * Base64-encoded response body for image responses only; omitted for other content types.
   */
  bodyBase64?: string;

  /**
   * Round-trip time in milliseconds.
   */
  timeMs: number;

  /**
   * Response body size in bytes.
   */
  sizeBytes: number;

  /**
   * Error message when the request failed; omitted on success.
   */
  error?: string;

  /**
   * Set-Cookie header values from the response; used by the cookie jar.
   */
  setCookieHeaders?: string[];

  /**
   * The outgoing request as actually sent; omitted on older results.
   */
  request?: SentRequest;

  /**
   * Ordered redirect hops that were followed; omitted when none.
   */
  redirects?: RedirectHop[];
}
