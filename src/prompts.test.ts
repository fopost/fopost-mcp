import { describe, it, expect, vi } from 'vitest';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { createServer } from './server.js';
import { getPrompt, MAX_PROMPT_ARG_CHARS, PROMPTS, PromptError } from './prompts.js';

const sample = (required: boolean) =>
  Object.fromEntries(
    PROMPTS.flatMap((p) => p.arguments)
      .filter((a) => !required || a.required)
      .map((a) => [a.name, `sample ${a.name}`]),
  );

async function connect() {
  const server = createServer({ apiKey: 'test-key-123456', baseUrl: 'https://api.test' }, '0.0.0');
  const client = new Client({ name: 'test', version: '1' });
  const [a, b] = InMemoryTransport.createLinkedPair();
  await Promise.all([server.connect(a), client.connect(b)]);
  return client;
}

describe('prompts', () => {
  it('renders every prompt from its required arguments alone', () => {
    for (const p of PROMPTS) {
      const text = getPrompt(p.name, sample(true)).messages[0].content.text;
      expect(text).not.toMatch(/undefined|\$\{/);
    }
  });

  it('keeps the approval rule in every prompt', () => {
    for (const p of PROMPTS) {
      expect(getPrompt(p.name, sample(false)).messages[0].content.text).toMatch(
        /until I approve it|until I say so|Do not change anything|This is a read/,
      );
    }
  });

  it('never names a tool, so the same text works on the hosted server', () => {
    for (const p of PROMPTS) {
      expect(getPrompt(p.name, sample(false)).messages[0].content.text).not.toMatch(
        /\b[a-z]+_[a-z_]+\b/,
      );
    }
  });

  it('refuses a missing argument, an unknown prompt and an oversized value', () => {
    expect(() => getPrompt('draft-post', {})).toThrow(PromptError);
    expect(() => getPrompt('nope', {})).toThrow(/Unknown prompt/);
    expect(() => getPrompt('draft-post', { idea: 'x'.repeat(MAX_PROMPT_ARG_CHARS + 1) })).toThrow(
      /longer than/,
    );
  });

  it('serves them over MCP without touching the API', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const client = await connect();

    const { prompts } = await client.listPrompts();
    expect(prompts.map((p) => p.name)).toEqual(PROMPTS.map((p) => p.name));

    const got = await client.getPrompt({ name: 'draft-post', arguments: { idea: 'Launch day' } });
    expect(JSON.stringify(got.messages)).toContain('Launch day');

    await expect(client.getPrompt({ name: 'draft-post', arguments: {} })).rejects.toThrow(/idea/);
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });
});
