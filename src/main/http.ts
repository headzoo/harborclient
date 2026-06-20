import type {
  BodyType,
  GeneralSettings,
  KeyValue,
  SendRequestInput,
  SendResult,
  SentRequest
} from '#/shared/types';
import { DEFAULT_GENERAL_SETTINGS } from '#/main/settings/generalSettings';

/**
 * Appends enabled query parameters to a base URL.
 *
 * @param baseUrl - Request URL before query string merging.
 * @param params - Key-value pairs to append as search params.
 * @returns URL with merged query parameters.
 */
export function buildUrl(baseUrl: string, params: KeyValue[]): string {
  const trimmed = baseUrl.trim();
  if (!trimmed) return trimmed;

  const enabledParams = params.filter((p) => p.enabled && p.key.trim());
  if (enabledParams.length === 0) return trimmed;

  try {
    const url = new URL(trimmed);
    for (const param of enabledParams) {
      url.searchParams.set(param.key.trim(), param.value);
    }
    return url.toString();
  } catch {
    const separator = trimmed.includes('?') ? '&' : '?';
    const query = enabledParams
      .map((p) => `${encodeURIComponent(p.key.trim())}=${encodeURIComponent(p.value)}`)
      .join('&');
    return `${trimmed}${separator}${query}`;
  }
}

/**
 * Builds request headers from enabled key-value pairs and body type defaults.
 *
 * @param headers - User-defined headers.
 * @param bodyType - Body type used to infer Content-Type when absent.
 * @returns Header map ready for fetch.
 */
export function buildHeaders(headers: KeyValue[], bodyType: BodyType): Record<string, string> {
  const result: Record<string, string> = {};

  for (const header of headers) {
    if (header.enabled && header.key.trim()) {
      result[header.key.trim()] = header.value;
    }
  }

  const hasContentType = Object.keys(result).some((key) => key.toLowerCase() === 'content-type');

  if (!hasContentType) {
    if (bodyType === 'json') {
      result['Content-Type'] = 'application/json';
    } else if (bodyType === 'text') {
      result['Content-Type'] = 'text/plain';
    }
  }

  return result;
}

/**
 * Combines optional cancel and timeout signals for fetch.
 *
 * @param signal - Optional user cancel signal.
 * @param timeoutMs - Request timeout in milliseconds; 0 disables timeout.
 */
function buildEffectiveSignal(
  signal: AbortSignal | undefined,
  timeoutMs: number
): AbortSignal | undefined {
  const signals: AbortSignal[] = [];
  if (signal) {
    signals.push(signal);
  }
  if (timeoutMs > 0) {
    signals.push(AbortSignal.timeout(timeoutMs));
  }

  if (signals.length === 0) {
    return undefined;
  }
  if (signals.length === 1) {
    return signals[0];
  }
  return AbortSignal.any(signals);
}

/**
 * Reads a response body, enforcing an optional max size in megabytes.
 *
 * @param response - Fetch response to read.
 * @param maxResponseSizeMb - Maximum body size in MB; 0 disables the limit.
 */
async function readResponseBody(
  response: Response,
  maxResponseSizeMb: number
): Promise<{ body: string; sizeBytes: number } | { error: string }> {
  const maxBytes = maxResponseSizeMb > 0 ? maxResponseSizeMb * 1024 * 1024 : 0;

  if (maxBytes === 0 || !response.body) {
    const body = await response.text();
    return { body, sizeBytes: new TextEncoder().encode(body).length };
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }
    if (value) {
      totalBytes += value.length;
      if (totalBytes > maxBytes) {
        await reader.cancel();
        return { error: `Response exceeded max size of ${maxResponseSizeMb} MB` };
      }
      chunks.push(value);
    }
  }

  const combined = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    combined.set(chunk, offset);
    offset += chunk.length;
  }

  const body = new TextDecoder().decode(combined);
  return { body, sizeBytes: totalBytes };
}

/**
 * Maps fetch errors to user-facing messages.
 *
 * @param err - Thrown fetch error.
 * @param timeoutMs - Configured request timeout in milliseconds.
 */
function mapFetchError(err: unknown, timeoutMs: number): string {
  if (err instanceof Error && err.name === 'AbortError') {
    return 'Request canceled';
  }
  if (err instanceof Error && err.name === 'TimeoutError') {
    return `Request timed out after ${timeoutMs} ms`;
  }
  if (err instanceof Error) {
    return err.message;
  }
  return 'Unknown error';
}

/**
 * Restores NODE_TLS_REJECT_UNAUTHORIZED after a request that disabled verification.
 *
 * @param previousValue - Prior env value before the request.
 */
function restoreTlsRejectUnauthorized(previousValue: string | undefined): void {
  if (previousValue === undefined) {
    delete process.env.NODE_TLS_REJECT_UNAUTHORIZED;
    return;
  }
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = previousValue;
}

/**
 * Executes an HTTP request via fetch and returns timing and response metadata.
 *
 * @param input - Method, URL, headers, params, body, and body type.
 * @param settings - General request settings for timeout, size limits, and SSL verification.
 * @param signal - Optional abort signal to cancel the in-flight request.
 * @returns Response status, headers, body, timing, and size; error field on failure.
 */
export async function executeRequest(
  input: SendRequestInput,
  settings: GeneralSettings = DEFAULT_GENERAL_SETTINGS,
  signal?: AbortSignal
): Promise<SendResult> {
  const url = buildUrl(input.url, input.params);
  const headers = buildHeaders(input.headers, input.bodyType);
  const sentBody =
    input.bodyType !== 'none' && input.method !== 'GET' && input.method !== 'HEAD'
      ? input.body
      : '';
  const request: SentRequest = {
    method: input.method,
    url,
    headers,
    body: sentBody
  };

  if (!url.trim()) {
    return {
      status: 0,
      statusText: 'Error',
      headers: {},
      body: '',
      timeMs: 0,
      sizeBytes: 0,
      error: 'URL is required',
      request: {
        method: input.method,
        url: input.url,
        headers,
        body: sentBody
      }
    };
  }

  const start = performance.now();
  const previousTlsReject = process.env.NODE_TLS_REJECT_UNAUTHORIZED;
  const effectiveSignal = buildEffectiveSignal(signal, settings.requestTimeoutMs);

  if (!settings.verifySsl) {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
  }

  try {
    const init: RequestInit = {
      method: input.method,
      headers,
      signal: effectiveSignal
    };

    if (input.bodyType !== 'none' && input.method !== 'GET' && input.method !== 'HEAD') {
      init.body = input.body;
    }

    const response = await fetch(url, init);
    const bodyResult = await readResponseBody(response, settings.maxResponseSizeMb);
    const timeMs = Math.round(performance.now() - start);

    const responseHeaders: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      responseHeaders[key] = value;
    });

    if ('error' in bodyResult) {
      return {
        status: 0,
        statusText: 'Error',
        headers: responseHeaders,
        body: '',
        timeMs,
        sizeBytes: 0,
        error: bodyResult.error,
        request
      };
    }

    return {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
      body: bodyResult.body,
      timeMs,
      sizeBytes: bodyResult.sizeBytes,
      request
    };
  } catch (err) {
    const timeMs = Math.round(performance.now() - start);

    return {
      status: 0,
      statusText: 'Error',
      headers: {},
      body: '',
      timeMs,
      sizeBytes: 0,
      error: mapFetchError(err, settings.requestTimeoutMs),
      request
    };
  } finally {
    if (!settings.verifySsl) {
      restoreTlsRejectUnauthorized(previousTlsReject);
    }
  }
}
