import type { ScriptRequestContext, ScriptRunResult, Variable } from '#/shared/types';

const VARIABLE_PATTERN = /\{\{\s*([\w.-]+)\s*\}\}/g;

/**
 * Builds a runtime variable map from collection variables.
 *
 * @param variables - Collection-scoped variables.
 * @returns Map of trimmed keys to resolved values.
 */
export function buildRuntimeVars(variables: Variable[]): Record<string, string> {
  const map: Record<string, string> = {};
  for (const variable of variables) {
    const key = variable.key.trim();
    if (!key) continue;
    map[key] = variable.value !== '' ? variable.value : variable.defaultValue;
  }
  return map;
}

/**
 * Replaces {{key}} placeholders using a runtime variable map.
 *
 * @param text - Text containing variable placeholders.
 * @param runtimeVars - Current runtime variable values.
 * @returns Text with known variables substituted.
 */
export function substituteWithMap(text: string, runtimeVars: Record<string, string>): string {
  return text.replace(VARIABLE_PATTERN, (match, key: string) => {
    const value = runtimeVars[key];
    return value !== undefined ? value : match;
  });
}

/**
 * Merges ephemeral variable sets from a script run into the runtime map.
 *
 * @param runtimeVars - Current runtime variables.
 * @param variableSets - New values set by hc.variables.set or hc.collection.variables.set.
 * @returns Updated runtime variable map.
 */
export function mergeVariableSets(
  runtimeVars: Record<string, string>,
  variableSets: Record<string, string>
): Record<string, string> {
  return { ...runtimeVars, ...variableSets };
}

/**
 * Applies script-set collection variable values onto a collection variable list.
 *
 * Updates existing keys in place and appends new rows for keys not yet defined.
 *
 * @param variables - Current collection-scoped variables.
 * @param collectionVariableSets - Values set via hc.collection.variables.set during send.
 * @returns Updated collection variable list.
 */
export function applyCollectionVariableSets(
  variables: Variable[],
  collectionVariableSets: Record<string, string>
): Variable[] {
  const updated = variables.map((variable) => ({ ...variable }));
  const indexByKey = new Map<string, number>();
  for (let i = 0; i < updated.length; i++) {
    const key = updated[i].key.trim();
    if (key) {
      indexByKey.set(key, i);
    }
  }

  for (const [rawKey, value] of Object.entries(collectionVariableSets)) {
    const key = rawKey.trim();
    if (!key) continue;

    const existingIndex = indexByKey.get(key);
    if (existingIndex !== undefined) {
      updated[existingIndex] = { ...updated[existingIndex], value };
    } else {
      updated.push({ key, value, defaultValue: '', share: false });
    }
  }

  return updated;
}

/**
 * Applies sandbox request mutations onto a working request context.
 *
 * @param current - Current request context.
 * @param result - Script run result with mutated request.
 * @returns Updated request context.
 */
export function applyScriptRequestMutations(
  current: ScriptRequestContext,
  result: ScriptRunResult
): ScriptRequestContext {
  return {
    method: result.request.method,
    url: result.request.url,
    headers: result.request.headers.map((header) => ({ ...header })),
    params: current.params,
    body: result.request.body,
    bodyType: current.bodyType
  };
}

/**
 * Ordered script slots to run for a send operation.
 */
export interface ScriptSlot {
  label: string;
  phase: 'pre' | 'post';
  source: string;
}

/**
 * Builds the ordered list of scripts to run for a send.
 *
 * @param collectionPre - Collection pre-request script.
 * @param collectionPost - Collection post-request script.
 * @param requestPre - Request pre-request script.
 * @param requestPost - Request post-request script.
 * @param phase - Which phase to collect.
 * @returns Ordered script slots for the phase.
 */
export function buildScriptSlots(
  collectionPre: string,
  collectionPost: string,
  requestPre: string,
  requestPost: string,
  phase: 'pre' | 'post'
): ScriptSlot[] {
  if (phase === 'pre') {
    return [
      { label: 'Collection pre-request', phase: 'pre' as const, source: collectionPre },
      { label: 'Request pre-request', phase: 'pre' as const, source: requestPre }
    ].filter((slot) => slot.source.trim());
  }

  return [
    { label: 'Collection post-request', phase: 'post' as const, source: collectionPost },
    { label: 'Request post-request', phase: 'post' as const, source: requestPost }
  ].filter((slot) => slot.source.trim());
}
