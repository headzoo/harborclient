import 'ses';
import type { ScriptRunInput, ScriptRunResult } from '#/shared/types';
import { evaluateScript } from '#/main/scripting/scriptEvaluator';

lockdown();

interface RunMessage {
  id: number;
  input: ScriptRunInput;
}

interface SuccessReply {
  id: number;
  ok: true;
  result: ScriptRunResult;
}

interface ErrorReply {
  id: number;
  ok: false;
  error: string;
}

/**
 * Handles a single script run request from the main process.
 *
 * @param message - Correlation id and script input payload.
 */
async function handleRunMessage(message: RunMessage): Promise<void> {
  const port = process.parentPort;
  if (!port) {
    return;
  }

  try {
    const result = await evaluateScript(message.input);
    const reply: SuccessReply = { id: message.id, ok: true, result };
    port.postMessage(reply);
  } catch (err) {
    const rawMessage =
      err && typeof err === 'object' && 'message' in err
        ? String((err as { message: unknown }).message)
        : String(err);
    const reply: ErrorReply = { id: message.id, ok: false, error: rawMessage };
    port.postMessage(reply);
  }
}

const port = process.parentPort;
if (port) {
  port.on('message', (event) => {
    const message = event.data as RunMessage;
    void handleRunMessage(message);
  });
}
