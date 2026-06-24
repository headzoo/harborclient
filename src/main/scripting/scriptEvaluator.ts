import 'ses';
import { transform } from 'esbuild';
import type { ScriptRunInput, ScriptRunResult } from '#/shared/types';

/** esbuild target for lowering modern user script syntax before compartment execution. */
const SCRIPT_TRANSPILE_TARGET = 'es2020';

const BOOTSTRAP = `
// hc API surface — keep autocomplete in hcCompletions.ts in sync with this bootstrap.
const ctx = JSON.parse(__CONTEXT__);
const state = {
  request: ctx.request,
  variables: Object.assign({}, ctx.variables),
  variableSets: {},
  collectionVariableSets: {},
  environmentVariableSets: {},
  collectionHeaders: ctx.collection && ctx.collection.headers ? ctx.collection.headers : [],
  tests: [],
  logs: [],
  phase: ctx.phase
};

function makeHeaderApi(getRows) {
  return {
    get: function(key) {
      const k = String(key).toLowerCase();
      const row = getRows().find(function(h) {
        return h.enabled && h.key.trim().toLowerCase() === k;
      });
      return row ? row.value : undefined;
    },
    upsert: function(key, value) {
      const k = String(key);
      const v = String(value);
      const rows = getRows();
      const existing = rows.find(function(h) {
        return h.enabled && h.key.trim().toLowerCase() === k.toLowerCase();
      });
      if (existing) {
        existing.value = v;
      } else {
        rows.push({ key: k, value: v, enabled: true });
      }
    },
    toObject: function() {
      const map = {};
      for (const h of getRows()) {
        if (h.enabled && h.key.trim()) {
          map[h.key.trim()] = h.value;
        }
      }
      return map;
    }
  };
}

function makeExpect(actual) {
  return {
    to: {
      equal: function(expected) {
        if (actual !== expected) {
          throw new Error(
            'Expected ' + JSON.stringify(expected) + ' but got ' + JSON.stringify(actual)
          );
        }
      },
      eql: function(expected) {
        if (JSON.stringify(actual) !== JSON.stringify(expected)) {
          throw new Error(
            'Expected ' + JSON.stringify(expected) + ' but got ' + JSON.stringify(actual)
          );
        }
      },
      include: function(substr) {
        if (typeof actual !== 'string' || actual.indexOf(substr) === -1) {
          throw new Error(
            'Expected ' + JSON.stringify(actual) + ' to include ' + JSON.stringify(substr)
          );
        }
      }
    },
    be: {
      ok: function() {
        if (!actual) {
          throw new Error('Expected truthy value but got ' + JSON.stringify(actual));
        }
      }
    }
  };
}

const hc = {
  request: {
    get method() { return state.request.method; },
    set method(v) { state.request.method = String(v); },
    get url() { return state.request.url; },
    set url(v) { state.request.url = String(v); },
    get body() { return state.request.body; },
    set body(v) { state.request.body = String(v); },
    headers: makeHeaderApi(function() { return state.request.headers; })
  },
  variables: {
    get: function(k) {
      if (Object.prototype.hasOwnProperty.call(state.variableSets, k)) {
        return state.variableSets[k];
      }
      return state.variables[k];
    },
    set: function(k, v) {
      state.variableSets[k] = String(v);
    }
  },
  collection: {
    get id() { return ctx.collection ? ctx.collection.id : null; },
    get name() { return ctx.collection ? ctx.collection.name : ''; },
    variables: {
      get: function(k) {
        if (Object.prototype.hasOwnProperty.call(state.collectionVariableSets, k)) {
          return state.collectionVariableSets[k];
        }
        return state.variables[k];
      },
      set: function(k, v) {
        state.collectionVariableSets[k] = String(v);
      }
    },
    headers: makeHeaderApi(function() { return state.collectionHeaders; })
  },
  environment: {
    get name() { return ctx.environment ? ctx.environment.name : ''; },
    variables: {
      get: function(k) {
        if (Object.prototype.hasOwnProperty.call(state.environmentVariableSets, k)) {
          return state.environmentVariableSets[k];
        }
        return state.variables[k];
      },
      set: function(k, v) {
        state.environmentVariableSets[k] = String(v);
      }
    }
  },
  test: function(name, fn) {
    try {
      fn();
      state.tests.push({ name: String(name), passed: true });
    } catch (err) {
      state.tests.push({
        name: String(name),
        passed: false,
        error: String(err && err.message ? err.message : err)
      });
    }
  },
  expect: function(actual) {
    return makeExpect(actual);
  }
};

if (ctx.response) {
  const resp = ctx.response;
  hc.response = {
    get code() { return resp.status; },
    get status() { return resp.statusText; },
    get headers() { return resp.headers; },
    get responseTime() { return resp.timeMs; },
    text: function() { return resp.body; },
    json: function() { return JSON.parse(resp.body); }
  };
}

const console = {
  log: function() {
    const args = Array.prototype.slice.call(arguments);
    state.logs.push(
      args.map(function(a) { return typeof a === 'string' ? a : JSON.stringify(a); }).join(' ')
    );
  },
  error: function() {
    const args = Array.prototype.slice.call(arguments);
    state.logs.push(
      '[error] ' +
        args.map(function(a) { return typeof a === 'string' ? a : JSON.stringify(a); }).join(' ')
    );
  }
};
`;

/**
 * Builds the passthrough result returned when a script is empty or on failure.
 *
 * @param input - Script run input carrying the current request context.
 * @returns Baseline result with no mutations, tests, or logs.
 */
export function buildScriptPassthrough(input: ScriptRunInput): ScriptRunResult {
  return {
    request: input.request,
    variableSets: {},
    collectionVariableSets: {},
    environmentVariableSets: {},
    collectionHeaders: input.collection?.headers ?? [],
    tests: [],
    logs: []
  };
}

/**
 * Strips filesystem paths and runtime framing from script errors before they reach the UI.
 *
 * User scripts and the sandbox runtime can embed absolute paths or eval framing locations
 * that are useful for main-process debugging but should not appear in the renderer.
 *
 * @param message - Raw error message from the script sandbox.
 * @returns Single-line message with absolute paths replaced by `[path]`.
 */
export function sanitizeScriptErrorMessage(message: string): string {
  const firstLine = message.split('\n')[0]?.trim() ?? '';
  if (!firstLine) {
    return 'Script execution failed';
  }

  let sanitized = firstLine.replace(/evalmachine\.<anonymous>/g, 'script');

  sanitized = sanitized
    .replace(/[A-Za-z]:[\\/][^\s'"(),\]}]+/g, '[path]')
    .replace(/(^|[\s(,])(\/(?:[\w.-]+\/)+[\w.-]*)/g, '$1[path]');

  return sanitized;
}

/**
 * Formats an esbuild transform failure into a single-line message for the UI.
 *
 * @param err - Thrown esbuild error or unknown value.
 * @returns Human-readable compile error text, optionally with line/column.
 */
export function formatEsbuildError(err: unknown): string {
  if (err && typeof err === 'object' && 'errors' in err) {
    const errors = (
      err as { errors: Array<{ text: string; location?: { line: number; column: number } }> }
    ).errors;
    const first = errors[0];
    if (first) {
      const loc = first.location;
      const prefix = loc ? `script:${loc.line}:${loc.column}: ` : '';
      return prefix + first.text;
    }
  }

  if (err && typeof err === 'object' && 'message' in err) {
    return String((err as { message: unknown }).message);
  }

  return String(err);
}

/**
 * Lowers modern JavaScript syntax in a user script via esbuild before compartment execution.
 *
 * Transpilation is syntax-only (no bundling). `import` and `require` are not
 * resolved or enabled.
 *
 * @param source - Raw user-authored script source.
 * @returns Transpiled script source safe to concatenate with the hc bootstrap.
 * @throws esbuild transform errors when the source is invalid.
 */
async function transpileUserScript(source: string): Promise<string> {
  const result = await transform(source, {
    loader: 'js',
    target: SCRIPT_TRANSPILE_TARGET,
    sourcefile: 'script.js'
  });
  return result.code;
}

/**
 * Runs a pre/post script inside a SES Compartment with the hc API.
 *
 * User source is transpiled with esbuild before execution so modern JavaScript
 * syntax is supported. The compartment receives only the hc bootstrap globals;
 * Node globals such as `require` and `process` are intentionally not passed
 * through. Callers in production should run this inside a locked-down
 * utilityProcess; unit tests call it directly without `lockdown()`.
 *
 * @param input - Script source, phase, request/response context, and variables.
 * @returns Mutated request, variable sets, tests, and logs from the sandbox.
 */
export async function evaluateScript(input: ScriptRunInput): Promise<ScriptRunResult> {
  const passthrough = buildScriptPassthrough(input);

  if (!input.script.trim()) {
    return passthrough;
  }

  const contextPayload = JSON.stringify({
    phase: input.phase,
    request: input.request,
    response: input.response,
    variables: input.variables,
    collection: input.collection,
    environment: input.environment
  });

  let compiledScript: string;
  try {
    compiledScript = await transpileUserScript(input.script);
  } catch (err) {
    return {
      ...passthrough,
      error: sanitizeScriptErrorMessage(formatEsbuildError(err))
    };
  }

  try {
    const compartment = new Compartment({
      globals: { __CONTEXT__: contextPayload, Date, Math },
      __options__: true
    });
    const fullScript = `${BOOTSTRAP}\n${compiledScript}\nJSON.stringify(state);`;
    const resultJson = compartment.evaluate(fullScript);
    const state = JSON.parse(String(resultJson)) as {
      request: ScriptRunResult['request'];
      variableSets: Record<string, string>;
      collectionVariableSets: Record<string, string>;
      environmentVariableSets: Record<string, string>;
      collectionHeaders: ScriptRunResult['collectionHeaders'];
      tests: ScriptRunResult['tests'];
      logs: string[];
    };

    return {
      request: state.request,
      variableSets: state.variableSets ?? {},
      collectionVariableSets: state.collectionVariableSets ?? {},
      environmentVariableSets: state.environmentVariableSets ?? {},
      collectionHeaders: state.collectionHeaders ?? [],
      tests: state.tests ?? [],
      logs: state.logs ?? []
    };
  } catch (err) {
    const rawMessage =
      err && typeof err === 'object' && 'message' in err
        ? String((err as { message: unknown }).message)
        : String(err);
    return {
      ...passthrough,
      error: sanitizeScriptErrorMessage(rawMessage)
    };
  }
}
