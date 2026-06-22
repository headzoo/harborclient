import type OpenAI from 'openai';
import type { ChatCompletion } from 'openai/resources/chat/completions';
import { LlmClientFactory } from '#/main/ai/LlmClientFactory';
import { getLocalRegistry } from '#/main/db/localRegistryInstance';
import type { LocalRegistry } from '#/main/db/LocalRegistry';
import { getAiModelById } from '#/shared/aiModels';
import type { ChatMessage, LlmProvider } from '#/shared/types';

/**
 * Dependencies injectable for unit tests.
 */
export interface CompleteChatTurnDeps {
  /**
   * Registry used to load chat history and persist the assistant reply.
   */
  registry: LocalRegistry;

  /**
   * Builds an OpenAI SDK client for the requested provider.
   */
  createClient: (provider: LlmProvider) => OpenAI;
}

/**
 * Reads assistant text from a chat completion response.
 *
 * @param response - OpenAI SDK chat completion result.
 * @returns Non-empty assistant message text.
 * @throws When the model returns no usable text content.
 */
export function extractAssistantContent(response: ChatCompletion): string {
  const content = response.choices[0]?.message?.content;
  if (content == null || content === '') {
    throw new Error('The model returned an empty response.');
  }
  if (typeof content === 'string') {
    return content;
  }

  throw new Error('The model returned an empty response.');
}

/**
 * Normalizes LLM client failures into user-facing errors.
 *
 * @param error - Error thrown by the OpenAI SDK or local validation.
 */
function toChatCompletionError(error: unknown): Error {
  if (error instanceof Error) {
    return error;
  }
  return new Error('Failed to get a response from the model.');
}

/**
 * Calls the LLM with a chat's full message history and persists the assistant reply.
 *
 * The caller must append the user message before invoking this function.
 *
 * @param chatId - Chat thread to complete.
 * @param modelId - Provider-specific model id selected in the composer.
 * @param deps - Optional registry and client factory overrides for tests.
 * @returns The persisted assistant message.
 * @throws When the chat, model, or LLM response is invalid.
 */
export async function completeChatTurn(
  chatId: number,
  modelId: string,
  deps?: CompleteChatTurnDeps
): Promise<ChatMessage> {
  const registry = deps?.registry ?? getLocalRegistry();
  const createClient =
    deps?.createClient ?? ((provider) => new LlmClientFactory().factory(provider));

  const modelOption = getAiModelById(modelId);
  if (!modelOption) {
    throw new Error(`Unknown model: ${modelId}`);
  }

  const chat = registry.getChat(chatId);
  if (!chat) {
    throw new Error('Chat not found');
  }
  if (chat.messages.length === 0 || chat.messages.at(-1)?.role !== 'user') {
    throw new Error('Chat has no user message to complete');
  }

  try {
    const client = createClient(modelOption.provider);
    const response = await client.chat.completions.create({
      model: modelOption.id,
      messages: chat.messages.map((message) => ({
        role: message.role,
        content: message.content
      }))
    });

    const assistantText = extractAssistantContent(response);
    registry.updateChatModel(chatId, modelOption.id);
    return registry.addChatMessage({
      chatId,
      role: 'assistant',
      content: assistantText,
      model: modelOption.id
    });
  } catch (error) {
    throw toChatCompletionError(error);
  }
}
