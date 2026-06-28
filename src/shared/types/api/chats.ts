import type {
  AddChatMessageInput,
  Chat,
  ChatMessage,
  ChatStepInput,
  ChatStepResult,
  ChatSummary,
  CreateChatInput,
  HubLlmModelGroup
} from '#/shared/types/ai';

/**
 * IPC methods for chats.
 */
export interface ApiChats {
  /**
   * Lists all AI chats ordered by most recently updated.
   */
  listChats: () => Promise<ChatSummary[]>;
  /**
   * Creates a new AI chat thread.
   *
   * @param input - Optional title and model for the new chat.
   */
  createChat: (input: CreateChatInput) => Promise<Chat>;
  /**
   * Loads a chat and its messages by id.
   *
   * @param id - Chat id to load.
   */
  getChat: (id: number) => Promise<Chat | null>;
  /**
   * Appends a message to a chat thread.
   *
   * @param input - Chat id, role, content, and optional model.
   */
  addChatMessage: (input: AddChatMessageInput) => Promise<ChatMessage>;
  /**
   * Runs one LLM completion step with tool definitions and returns text or tool calls.
   *
   * @param input - Model id and conversation messages for the step.
   */
  completeChatStep: (input: ChatStepInput) => Promise<ChatStepResult>;
  /**
   * Lists LLM models offered by configured Team Hubs for the current user.
   */
  listHubLlmModels: () => Promise<HubLlmModelGroup[]>;
  /**
   * Deletes a chat and its messages.
   *
   * @param id - Chat id to delete.
   */
  deleteChat: (id: number) => Promise<void>;
}
