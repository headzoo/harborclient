import type { BodyType, ScriptTestResult } from '#/shared/types';

/**
 * Pretty-prints JSON response bodies when valid; returns raw text otherwise.
 *
 * @param body - Raw response body string.
 * @returns Formatted body for display.
 */
export function formatBody(body: string): string {
  if (!body) return '';
  try {
    return JSON.stringify(JSON.parse(body), null, 2);
  } catch {
    return body;
  }
}

/**
 * Formats a sent request body for console display based on body type.
 *
 * @param body - Raw or summarized request body string.
 * @param bodyType - Request body type when known.
 * @returns Formatted body for display.
 */
export function formatSentRequestBody(body: string, bodyType?: BodyType): string {
  if (!body) return '';
  if (bodyType === 'multipart' || bodyType === 'urlencoded') {
    return body;
  }
  return formatBody(body);
}

/**
 * Returns true when the body is valid JSON.
 *
 * @param body - Raw body string.
 */
export function isValidJson(body: string): boolean {
  if (!body.trim()) return false;
  try {
    JSON.parse(body);
    return true;
  } catch {
    return false;
  }
}

/**
 * Chooses a syntax mode from content-type or JSON validity.
 *
 * @param body - Raw body string.
 * @param headers - Response headers map.
 */
export function bodyLanguage(body: string, headers?: Record<string, string>): 'json' | 'text' {
  const contentType = headers?.['content-type'] ?? headers?.['Content-Type'] ?? '';
  if (contentType.includes('json')) return 'json';
  return isValidJson(body) ? 'json' : 'text';
}

/**
 * Chooses a syntax mode for a sent request body based on body type and headers.
 *
 * @param body - Raw or summarized request body string.
 * @param bodyType - Request body type when known.
 * @param headers - Request headers map.
 */
export function sentRequestBodyLanguage(
  body: string,
  bodyType?: BodyType,
  headers?: Record<string, string>
): 'json' | 'text' {
  if (bodyType === 'multipart' || bodyType === 'urlencoded') {
    return 'text';
  }
  return bodyLanguage(body, headers);
}

/**
 * Section title for a sent request body in the console inspector.
 *
 * @param bodyType - Request body type when known.
 */
export function sentRequestBodySectionTitle(bodyType?: BodyType): string {
  return bodyType === 'multipart' ? 'Form Data' : 'Payload';
}

/**
 * Formats a byte count as B, KB, or MB.
 *
 * @param bytes - Response body size in bytes.
 * @returns Human-readable size string.
 */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Serializes response headers as HTTP-style `Key: Value` lines for copy/export.
 *
 * @param headers - Response headers map.
 * @returns Header lines joined by newlines, or an empty string when none.
 */
export function formatHeadersText(headers: Record<string, string>): string {
  return Object.entries(headers)
    .map(([key, value]) => `${key}: ${value}`)
    .join('\n');
}

/**
 * Serializes script test results as plain text for copy/export.
 *
 * @param testResults - hc.test results from the last send.
 * @returns One line per test (`PASS name` or `FAIL name — error`).
 */
export function formatTestsText(testResults: ScriptTestResult[]): string {
  return testResults
    .map((test) =>
      test.passed ? `PASS ${test.name}` : `FAIL ${test.name}${test.error ? ` — ${test.error}` : ''}`
    )
    .join('\n');
}

/**
 * Default save-dialog filename for a response body export.
 *
 * @param body - Raw response body string.
 * @param headers - Response headers map.
 * @returns `response.json` when JSON, otherwise `response.txt`.
 */
export function responseBodyExportPath(body: string, headers?: Record<string, string>): string {
  return bodyLanguage(body, headers) === 'json' ? 'response.json' : 'response.txt';
}

/**
 * Default save-dialog filename for the active response viewer tab.
 *
 * @param tab - Active Body, Headers, or Tests tab.
 * @param body - Raw response body string.
 * @param headers - Response headers map.
 * @returns Suggested filename for the native save dialog.
 */
export function responseTabExportPath(
  tab: 'body' | 'headers' | 'tests',
  body: string,
  headers: Record<string, string>
): string {
  if (tab === 'headers') return 'response-headers.txt';
  if (tab === 'tests') return 'response-tests.txt';
  return responseBodyExportPath(body, headers);
}

/**
 * Text content for the active response viewer tab (copy/export).
 *
 * @param tab - Active Body, Headers, or Tests tab.
 * @param body - Raw response body string.
 * @param headers - Response headers map.
 * @param testResults - hc.test results from the last send.
 * @returns Serialized tab content.
 */
export function responseTabText(
  tab: 'body' | 'headers' | 'tests',
  body: string,
  headers: Record<string, string>,
  testResults: ScriptTestResult[]
): string {
  if (tab === 'headers') return formatHeadersText(headers);
  if (tab === 'tests') return formatTestsText(testResults);
  return formatBody(body);
}
