import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { FoPostClient } from './client.js';
import { postsTools } from './tools/posts.js';
import { accountsTools } from './tools/accounts.js';
import { aiTools } from './tools/ai.js';
import type { ToolDefinition } from './types.js';

/**
 * The API serves every route under /v1 on the bare host. A /api/v1 prefix
 * 404s, which is exactly how the published server shipped broken.
 */
const UUID = '9b2f6c1e-0000-4000-8000-000000000001';

/** One valid input per tool, so every tool's request path gets exercised. */
const TOOL_INPUTS: Record<string, unknown> = {
  list_posts: { workspace_id: UUID },
  get_post: { id: UUID },
  schedule_post: { workspace_id: UUID, content: 'hi', account_ids: [UUID] },
  edit_post: { id: UUID, content: 'hi' },
  cancel_post: { id: UUID },
  delete_post: { id: UUID },
  list_post_deliveries: { id: UUID },
  list_accounts: { workspace_id: UUID },
  get_account_health: { account_id: UUID },
  list_workspaces: {},
  generate_caption: { current_caption: 'hi' },
  rewrite_for_platforms: { content: 'hi', platforms: ['twitter'] },
  repurpose_url: { url: 'https://example.com', platforms: ['twitter'] },
  get_ai_credits: {},
};

let urls: string[];
let originalFetch: typeof globalThis.fetch;

function allTools(baseUrl = 'https://api.fopost.com'): ToolDefinition[] {
  const client = new FoPostClient({ apiKey: 'test-key', baseUrl });
  return [...postsTools(client), ...accountsTools(client), ...aiTools(client)];
}

beforeEach(() => {
  urls = [];
  originalFetch = globalThis.fetch;
  globalThis.fetch = (async (input: string | URL | Request) => {
    urls.push(String(input));
    return new Response(JSON.stringify({ data: { id: UUID } }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  }) as unknown as typeof fetch;
});

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe('request paths', () => {
  it('covers every registered tool with an input fixture', () => {
    expect(
      allTools()
        .map((t) => t.name)
        .sort(),
    ).toEqual(Object.keys(TOOL_INPUTS).sort());
  });

  it('sends every tool request to /v1, never /api/v1', async () => {
    for (const tool of allTools()) {
      await tool.execute(tool.inputSchema.parse(TOOL_INPUTS[tool.name]));
    }

    expect(urls.length).toBeGreaterThanOrEqual(14);
    for (const url of urls) {
      const path = new URL(url).pathname;
      expect(path).not.toContain('/api/v1');
      expect(path.startsWith('/v1/')).toBe(true);
    }
  });

  it('appends /v1 to the configured host without doubling the prefix', async () => {
    const tools = allTools('https://self.hosted.example/');
    const listWorkspaces = tools.find((t) => t.name === 'list_workspaces')!;
    await listWorkspaces.execute({});
    expect(urls[0]).toBe('https://self.hosted.example/v1/workspaces');
  });
});
