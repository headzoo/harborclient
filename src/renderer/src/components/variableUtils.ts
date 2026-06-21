import type { Variable } from '#/shared/types';

/**
 * Drops variable rows with no key, value, or default content.
 *
 * @param variables - Raw variable rows from a form.
 * @returns Non-empty rows safe to persist.
 */
export const cleanVariables = (variables: Variable[]): Variable[] =>
  variables.filter((v) => v.key.trim() || v.value.trim() || v.defaultValue.trim());
