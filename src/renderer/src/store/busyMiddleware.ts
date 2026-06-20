import type { Middleware, UnknownAction } from '@reduxjs/toolkit';
import { operationFinished, operationStarted } from '#/renderer/src/store/slices/uiSlice';

const EXCLUDED_THUNKS = new Set(['tabs/sendRequest', 'tabs/cancelRequest']);

const pendingRequests = new Set<string>();

type AsyncPhase = 'pending' | 'fulfilled' | 'rejected';

function parseAsyncActionType(actionType: string): { thunkType: string; phase: AsyncPhase } | null {
  const match = actionType.match(/^(.+)\/(pending|fulfilled|rejected)$/);
  if (!match) return null;
  return { thunkType: match[1], phase: match[2] as AsyncPhase };
}

function isAsyncThunkAction(action: UnknownAction): action is UnknownAction & {
  meta: { requestId: string };
} {
  return typeof action.meta === 'object' && action.meta != null && 'requestId' in action.meta;
}

/**
 * Tracks in-flight RTK async thunks and updates global busy state.
 * HTTP send/cancel thunks are excluded because they have dedicated UI feedback.
 */
export const busyMiddleware: Middleware = (store) => (next) => (action) => {
  const result = next(action);

  if (!isAsyncThunkAction(action)) {
    return result;
  }

  const parsed = parseAsyncActionType(action.type);
  if (!parsed || EXCLUDED_THUNKS.has(parsed.thunkType)) {
    return result;
  }

  const { requestId } = action.meta;

  if (parsed.phase === 'pending') {
    if (!pendingRequests.has(requestId)) {
      pendingRequests.add(requestId);
      store.dispatch(operationStarted());
    }
    return result;
  }

  if (pendingRequests.has(requestId)) {
    pendingRequests.delete(requestId);
    store.dispatch(operationFinished());
  }

  return result;
};
