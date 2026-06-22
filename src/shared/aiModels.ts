import type { AiSettings, LlmProvider } from '#/shared/types';

/**
 * Selectable AI model exposed in the chat composer.
 */
export interface AiModelOption {
  /**
   * Provider-specific model id sent to the API.
   */
  id: string;

  /**
   * Human-readable label for the model dropdown.
   */
  label: string;

  /**
   * LLM provider that owns this model.
   */
  provider: LlmProvider;
}

/**
 * Catalog of supported AI models grouped by provider.
 */
export const AI_MODELS: AiModelOption[] = [
  { id: 'gpt-4o', label: 'GPT-4o', provider: 'openai' },
  { id: 'gpt-4o-mini', label: 'GPT-4o Mini', provider: 'openai' },
  { id: 'claude-3-5-sonnet-20241022', label: 'Claude 3.5 Sonnet', provider: 'claude' },
  { id: 'claude-3-5-haiku-20241022', label: 'Claude 3.5 Haiku', provider: 'claude' },
  { id: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro', provider: 'gemini' },
  { id: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash', provider: 'gemini' }
];

/**
 * Returns whether a provider has a configured API key.
 *
 * @param settings - Stored AI provider API keys.
 * @param provider - Provider to check.
 */
function hasProviderKey(settings: AiSettings, provider: LlmProvider): boolean {
  switch (provider) {
    case 'openai':
      return settings.openaiApiKey.trim().length > 0;
    case 'claude':
      return settings.claudeApiKey.trim().length > 0;
    case 'gemini':
      return settings.geminiApiKey.trim().length > 0;
    default: {
      const exhaustive: never = provider;
      return exhaustive;
    }
  }
}

/**
 * Returns chat models whose provider has a configured API key.
 *
 * @param settings - Stored AI provider API keys.
 */
export function getAvailableModels(settings: AiSettings): AiModelOption[] {
  return AI_MODELS.filter((model) => hasProviderKey(settings, model.provider));
}

/**
 * Looks up a catalog model by its provider-specific id.
 *
 * @param modelId - Model id from the chat composer or persisted chat record.
 * @returns The matching catalog entry, or undefined when unknown.
 */
export function getAiModelById(modelId: string): AiModelOption | undefined {
  return AI_MODELS.find((model) => model.id === modelId);
}
