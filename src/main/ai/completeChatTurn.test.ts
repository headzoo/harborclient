import { mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type OpenAI from 'openai';
import { completeChatTurn, extractAssistantContent } from '#/main/ai/completeChatTurn';
import { LocalRegistry } from '#/main/db/LocalRegistry';
import { describeSqlite } from '#/test/nativeModules';

const cleanups: Array<() => void | Promise<void>> = [];

/**
 * Creates an isolated registry database for tests.
 */
async function createRegistry(): Promise<LocalRegistry> {
  const rootDir = mkdtempSync(join(tmpdir(), 'harborclient-complete-chat-'));
  const registry = new LocalRegistry(rootDir);
  await registry.init();
  cleanups.push(async () => {
    await registry.close();
    rmSync(rootDir, { recursive: true, force: true });
  });
  return registry;
}

afterEach(async () => {
  while (cleanups.length > 0) {
    await cleanups.pop()?.();
  }
});

describe('extractAssistantContent', () => {
  it('returns string content from the first choice', () => {
    expect(
      extractAssistantContent({
        choices: [{ message: { role: 'assistant', content: 'Hello' } }]
      } as Parameters<typeof extractAssistantContent>[0])
    ).toBe('Hello');
  });

  it('throws when the model returns no content', () => {
    expect(() =>
      extractAssistantContent({
        choices: [{ message: { role: 'assistant', content: null } }]
      } as Parameters<typeof extractAssistantContent>[0])
    ).toThrow(/empty response/);
  });
});

describeSqlite('completeChatTurn', () => {
  it('sends full chat history to the LLM and persists the assistant reply', async () => {
    const registry = await createRegistry();
    const chat = registry.createChat({ model: 'gpt-4o' });
    registry.addChatMessage({ chatId: chat.id, role: 'user', content: 'First question' });
    registry.addChatMessage({
      chatId: chat.id,
      role: 'assistant',
      content: 'First answer'
    });
    registry.addChatMessage({ chatId: chat.id, role: 'user', content: 'Follow up' });

    const create = vi.fn().mockResolvedValue({
      choices: [{ message: { role: 'assistant', content: 'Model reply' } }]
    });
    const mockClient = {
      chat: {
        completions: {
          create
        }
      }
    } as unknown as OpenAI;

    const assistantMessage = await completeChatTurn(chat.id, 'gpt-4o', {
      registry,
      createClient: () => mockClient
    });

    expect(create).toHaveBeenCalledWith({
      model: 'gpt-4o',
      messages: [
        { role: 'user', content: 'First question' },
        { role: 'assistant', content: 'First answer' },
        { role: 'user', content: 'Follow up' }
      ]
    });
    expect(assistantMessage.content).toBe('Model reply');
    expect(registry.getChat(chat.id)?.model).toBe('gpt-4o');
    expect(registry.getChat(chat.id)?.messages).toHaveLength(4);
  });

  it('throws when the chat ends with an assistant message', async () => {
    const registry = await createRegistry();
    const chat = registry.createChat({});
    registry.addChatMessage({ chatId: chat.id, role: 'assistant', content: 'Already answered' });

    await expect(
      completeChatTurn(chat.id, 'gpt-4o', {
        registry,
        createClient: () =>
          ({
            chat: { completions: { create: vi.fn() } }
          }) as unknown as OpenAI
      })
    ).rejects.toThrow(/no user message to complete/);
  });
});
