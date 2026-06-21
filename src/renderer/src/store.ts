import type { Variable } from '#/shared/types';

const VARIABLE_PATTERN = /\{\{\s*([\w.-]+)\s*\}\}/g;

/**
 * A segment of text, optionally marking a {{variable}} token.
 */
export interface VariableToken {
  text: string;
  key?: string;
}

/**
 * Builds a lookup map from collection variables.
 *
 * @param variables - Collection-scoped variables.
 * @returns Map of trimmed keys to resolved values.
 */
function variableLookup(variables: Variable[]): Map<string, string> {
  return new Map(
    variables
      .filter((v) => v.key.trim())
      .map((v) => [v.key.trim(), v.value !== '' ? v.value : v.defaultValue])
  );
}

/**
 * Splits text into plain and {{variable}} segments.
 *
 * @param text - Text containing variable placeholders.
 * @returns Ordered tokens for rendering or further processing.
 */
export function tokenizeVariables(text: string): VariableToken[] {
  const tokens: VariableToken[] = [];
  const pattern = new RegExp(VARIABLE_PATTERN.source, 'g');
  let lastIndex = 0;

  for (const match of text.matchAll(pattern)) {
    const index = match.index ?? 0;
    if (index > lastIndex) {
      tokens.push({ text: text.slice(lastIndex, index) });
    }
    tokens.push({ text: match[0], key: match[1] });
    lastIndex = index + match[0].length;
  }

  if (lastIndex < text.length) {
    tokens.push({ text: text.slice(lastIndex) });
  }

  return tokens;
}

/**
 * Resolves a single variable key against collection variables.
 *
 * @param key - Variable name from a {{key}} placeholder.
 * @param variables - Collection-scoped variables.
 * @returns Resolved value, or undefined when the key is not defined.
 */
export function resolveVariable(key: string, variables: Variable[]): string | undefined {
  return variableLookup(variables).get(key);
}

/**
 * Replaces {{key}} placeholders in text with collection variable values.
 *
 * @param text - Text containing variable placeholders.
 * @param variables - Collection-scoped variables.
 * @returns Text with known variables substituted; unknown tokens are left unchanged.
 */
export function substituteVariables(text: string, variables: Variable[]): string {
  const lookup = variableLookup(variables);

  return text.replace(VARIABLE_PATTERN, (match, key: string) => {
    const value = lookup.get(key);
    return value !== undefined ? value : match;
  });
}

export type { ConsoleEntry } from '#/renderer/src/store/slices/consoleSlice';
