import type { AuthConfig, KeyValue, Variable } from '#/shared/types';
import { cleanVariables } from '#/renderer/src/components/variableUtils';

/**
 * Drops header rows with no key or value content.
 *
 * @param headers - Raw header rows from a form.
 */
export const cleanHeaders = (headers: KeyValue[]): KeyValue[] =>
  headers.filter((h) => h.key.trim() || h.value.trim());

/**
 * Serializes collection form fields for dirty-state comparison and persistence.
 */
export const serializeCollectionForm = (
  name: string,
  variables: Variable[],
  headers: KeyValue[],
  preRequestScript: string,
  postRequestScript: string,
  auth: AuthConfig,
  connectionId: string
): string =>
  JSON.stringify({
    name: name.trim(),
    variables: cleanVariables(variables),
    headers: cleanHeaders(headers),
    pre_request_script: preRequestScript,
    post_request_script: postRequestScript,
    auth,
    connectionId
  });
