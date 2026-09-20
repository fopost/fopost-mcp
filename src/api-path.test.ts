import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { FoPostClient } from './client.js';
import { postsTools } from './tools/posts.js';
import { accountsTools } from './tools/accounts.js';
import { aiTools } from './tools/ai.js';
import { inboxTools } from './tools/inbox.js';
import { adsTools } from './tools/ads.js';
import { activityTools } from './tools/activity.js';
import type { ToolDefinition } from './types.js';

/**
 * The API serves every route under /v1 on the bare host. A /api/v1 prefix
 * 404s, which is exactly how the published server shipped broken.
 */
const UUID = '9b2f6c1e-0000-4000-8000-000000000001';

const AD_BASE = {
  workspace_id: UUID,
  connection_id: UUID,
  ad_account_id: 'act_1',
  name: 'Spring launch',
  goal: 'traffic',
  budget: { minor: 1000, type: 'daily' },
  targeting: { countries: ['DE'], age_min: 18, age_max: 65, gender: 'all' },
};

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
  rename_account: { account_id: UUID, display_name: null },
  list_account_groups: { workspace_id: UUID },
  get_account_group: { id: UUID },
  create_account_group: { workspace_id: UUID, name: 'EU', account_ids: [UUID] },
  rename_account_group: { id: UUID, name: 'US' },
  set_account_group_members: { id: UUID, account_ids: [UUID] },
  delete_account_group: { id: UUID },
  create_telegram_connect_code: { workspace_id: UUID },
  get_telegram_connect_status: { code: 'abc123' },
  get_telegram_bot_commands: { account_id: UUID },
  set_telegram_bot_commands: {
    account_id: UUID,
    commands: [{ command: 'help', description: 'Show help' }],
  },
  clear_telegram_bot_commands: { account_id: UUID },
  list_slack_channels: { account_id: UUID },
  list_slack_members: { account_id: UUID },
  get_slack_identity: { account_id: UUID },
  set_slack_identity: { account_id: UUID, username: 'Launch Bot', icon_url: null },
  generate_caption: { current_caption: 'hi' },
  rewrite_for_platforms: { content: 'hi', platforms: ['twitter'] },
  repurpose_url: { url: 'https://example.com', platforms: ['twitter'] },
  get_ai_credits: {},
  list_inbox: { workspace_id: UUID },
  list_inbox_threads: { workspace_id: UUID, kind: 'mentions' },
  list_inbox_conversations: { workspace_id: UUID },
  get_inbox_unread_count: {},
  mark_inbox_thread_read: { workspace_id: UUID, account_id: UUID, post_external_id: 'p1' },
  reply_to_inbox_item: { id: UUID, text: 'hi' },
  update_inbox_item: { id: UUID, state: 'snoozed', snoozed_until: '2030-01-01T00:00:00Z' },
  hide_inbox_item: { id: UUID },
  unhide_inbox_item: { id: UUID },
  delete_inbox_item: { id: UUID },
  edit_inbox_comment: { id: UUID, text: 'fixed' },
  like_inbox_item: { id: UUID },
  unlike_inbox_item: { id: UUID },
  pin_inbox_item: { id: UUID },
  unpin_inbox_item: { id: UUID },
  react_to_inbox_item: { id: UUID, reaction: null },
  start_inbox_conversation: { account_id: UUID, handle: 'someone', text: 'hi' },
  set_inbox_typing: { conversation_id: 'c1', account_id: UUID, on: false },
  list_inbox_approvals: { workspace_id: UUID },
  approve_inbox_reply: { id: 7, text: 'hi' },
  reject_inbox_reply: { id: 7 },
  refresh_inbox: { workspace_id: UUID },
  list_ads: { workspace_id: UUID },
  list_external_ads: {},
  list_boostable_posts: {},
  list_ad_sources: {},
  boost_post: { ...AD_BASE, post_id: UUID, account_id: UUID },
  create_ad: { ...AD_BASE, page_id: '123', text: 'hi' },
  set_ad_status: { id: UUID, workspace_id: UUID, status: 'active' },
  refresh_ad: { id: UUID, workspace_id: UUID },
  delete_ad: { id: UUID, workspace_id: UUID },
  list_audiences: { connection_id: UUID, ad_account_id: 'act_1' },
  search_ad_targeting: { connection_id: UUID, type: 'city', q: 'Berlin' },
  list_lead_forms: {},
  list_leads: { form_id: 'f1', connection_id: UUID, page_id: '123', after: 'c1' },
  get_ad_account_tree: { connection_id: UUID, ad_account_id: 'act_1' },
  create_ad_campaign: {
    workspace_id: UUID,
    connection_id: UUID,
    ad_account_id: 'act_1',
    name: 'Launch',
    goal: 'traffic',
  },
  get_ad_campaign: { id: '120', connection_id: UUID },
  update_ad_campaign: { id: '120', workspace_id: UUID, connection_id: UUID, status: 'paused' },
  delete_ad_campaign: { id: '120', workspace_id: UUID, connection_id: UUID },
  duplicate_ad_campaign: { id: '120', workspace_id: UUID, connection_id: UUID },
  create_ad_set: {
    workspace_id: UUID,
    connection_id: UUID,
    campaign_id: '120',
    page_id: '123',
    name: 'EU',
    goal: 'traffic',
    budget: AD_BASE.budget,
    targeting: AD_BASE.targeting,
  },
  get_ad_set: { id: '130', connection_id: UUID },
  update_ad_set: { id: '130', workspace_id: UUID, connection_id: UUID, budget_minor: 500 },
  delete_ad_set: { id: '130', workspace_id: UUID, connection_id: UUID },
  duplicate_ad_set: { id: '130', workspace_id: UUID, connection_id: UUID, paused: false },
  create_network_ad: {
    workspace_id: UUID,
    connection_id: UUID,
    ad_set_id: '130',
    creative_id: '150',
    name: 'A',
  },
  get_network_ad: { id: '140', connection_id: UUID },
  update_network_ad: { id: '140', workspace_id: UUID, connection_id: UUID, creative_id: '151' },
  delete_network_ad: { id: '140', workspace_id: UUID, connection_id: UUID },
  duplicate_network_ad: { id: '140', workspace_id: UUID, connection_id: UUID },
  bulk_set_ad_status: {
    workspace_id: UUID,
    connection_id: UUID,
    status: 'paused',
    objects: [{ id: '120', level: 'campaign' }],
  },
  list_ad_creatives: { connection_id: UUID, ad_account_id: 'act_1' },
  create_ad_creative: {
    workspace_id: UUID,
    connection_id: UUID,
    ad_account_id: 'act_1',
    page_id: '123',
    name: 'C',
    format: 'image',
    text: 'hi',
    url_tags: 'utm_source=meta',
  },
  get_ad_creative: { id: '150', connection_id: UUID },
  delete_ad_creative: { id: '150', workspace_id: UUID, connection_id: UUID },
  get_audience: { id: '160', connection_id: UUID },
  update_audience: { id: '160', workspace_id: UUID, connection_id: UUID, name: 'VIPs' },
  delete_audience: { id: '160', workspace_id: UUID, connection_id: UUID },
  add_audience_users: {
    id: '160',
    workspace_id: UUID,
    connection_id: UUID,
    emails: ['a@yourbrand.com'],
  },
  estimate_ad_reach: {
    workspace_id: UUID,
    connection_id: UUID,
    ad_account_id: 'act_1',
    page_id: '123',
    targeting: AD_BASE.targeting,
  },
  get_ad_object_insights: {
    connection_id: UUID,
    object_id: '120',
    since: '2026-09-01',
    until: '2026-09-07',
    breakdown: 'age',
    daily: true,
  },
  get_ad_insights: { id: UUID, workspace_id: UUID, since: '2026-09-01', until: '2026-09-07' },
  get_lead_form: { form_id: 'f1', connection_id: UUID, page_id: '123' },
  archive_lead_form: { form_id: 'f1', workspace_id: UUID, connection_id: UUID, page_id: '123' },
  list_leads_feed: { workspace_id: UUID, form_id: 'f1', cursor: 'next1', limit: 50 },
  list_lead_pages: {},
  subscribe_lead_page: { workspace_id: UUID, connection_id: UUID, page_id: '123' },
  unsubscribe_lead_page: { page_id: '123', workspace_id: UUID, connection_id: UUID },
  list_activity: { workspace_id: UUID, kind: 'security' },
  list_audit_events: { workspace_id: UUID },
};

let urls: string[];
let requests: { method: string; url: string; body: unknown }[];
let originalFetch: typeof globalThis.fetch;

function allTools(baseUrl = 'https://api.fopost.com'): ToolDefinition[] {
  const client = new FoPostClient({ apiKey: 'test-key', baseUrl });
  return [
    ...postsTools(client),
    ...accountsTools(client),
    ...aiTools(client),
    ...inboxTools(client),
    ...adsTools(client),
    ...activityTools(client),
  ];
}

beforeEach(() => {
  urls = [];
  requests = [];
  originalFetch = globalThis.fetch;
  globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
    urls.push(String(input));
    requests.push({
      method: init?.method ?? 'GET',
      url: String(input),
      body: typeof init?.body === 'string' ? JSON.parse(init.body) : undefined,
    });
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

    expect(urls.length).toBeGreaterThanOrEqual(99);
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

describe('inbox and ads requests', () => {
  function run(name: string) {
    const tool = allTools().find((t) => t.name === name)!;
    return tool.execute(tool.inputSchema.parse(TOOL_INPUTS[name]));
  }

  it('sends inbox filters as snake_case query params', async () => {
    await run('list_inbox_threads');
    const url = new URL(requests[0].url);
    expect(url.pathname).toBe('/v1/inbox/posts');
    expect(url.searchParams.get('workspace_id')).toBe(UUID);
    expect(url.searchParams.get('kind')).toBe('mentions');
  });

  it('patches an inbox item with a camelCase body', async () => {
    await run('update_inbox_item');
    expect(requests[0].method).toBe('PATCH');
    expect(new URL(requests[0].url).pathname).toBe(`/v1/inbox/${UUID}`);
    expect(requests[0].body).toEqual({ state: 'snoozed', snoozedUntil: '2030-01-01T00:00:00Z' });
  });

  it('sends the inbox action bodies as the API expects them', async () => {
    const reply = allTools().find((t) => t.name === 'reply_to_inbox_item')!;
    await reply.execute(
      reply.inputSchema.parse({ id: UUID, media_ids: ['m1'], quick_replies: ['Yes'] }),
    );
    expect(requests[0].body).toEqual({ media_ids: ['m1'], quick_replies: ['Yes'] });

    await run('edit_inbox_comment');
    expect(requests[1].method).toBe('PATCH');
    expect(requests[1].body).toEqual({ text: 'fixed' });

    await run('react_to_inbox_item');
    expect(new URL(requests[2].url).pathname).toBe(`/v1/inbox/${UUID}/react`);
    expect(requests[2].body).toEqual({ reaction: null });

    await run('start_inbox_conversation');
    expect(new URL(requests[3].url).pathname).toBe('/v1/inbox/conversations');
    expect(requests[3].body).toEqual({ account_id: UUID, handle: 'someone', text: 'hi' });

    await run('set_inbox_typing');
    expect(new URL(requests[4].url).pathname).toBe('/v1/inbox/conversations/c1/typing');
    expect(requests[4].body).toEqual({ account_id: UUID, on: false });
  });

  it('posts a boost as a camelCase body that starts paused unless told otherwise', async () => {
    await run('boost_post');
    expect(requests[0].method).toBe('POST');
    expect(new URL(requests[0].url).pathname).toBe('/v1/ads/boost');
    expect(requests[0].body).toMatchObject({
      workspaceId: UUID,
      connectionId: UUID,
      adAccountId: 'act_1',
      postId: UUID,
      accountId: UUID,
      budget: { minor: 1000, type: 'daily' },
      targeting: { countries: ['DE'], ageMin: 18, ageMax: 65, gender: 'all' },
    });
    expect(requests[0].body).not.toHaveProperty('paused');
    expect(requests[0].body).not.toHaveProperty('workspace_id');
  });

  it('sets ad status with workspace_id in the query and status in the body', async () => {
    await run('set_ad_status');
    const url = new URL(requests[0].url);
    expect(requests[0].method).toBe('PATCH');
    expect(url.pathname).toBe(`/v1/ads/${UUID}`);
    expect(url.searchParams.get('workspace_id')).toBe(UUID);
    expect(requests[0].body).toEqual({ status: 'active' });
  });

  it('reads the account tree with connection_id in the query', async () => {
    await run('get_ad_account_tree');
    const url = new URL(requests[0].url);
    expect(url.pathname).toBe('/v1/ads/accounts/act_1/tree');
    expect(url.searchParams.get('connection_id')).toBe(UUID);
  });

  it('changes a campaign with the ids in the query and a camelCase body', async () => {
    await run('update_ad_campaign');
    const url = new URL(requests[0].url);
    expect(requests[0].method).toBe('PATCH');
    expect(url.pathname).toBe('/v1/ads/campaigns/120');
    expect(url.searchParams.get('workspace_id')).toBe(UUID);
    expect(url.searchParams.get('connection_id')).toBe(UUID);
    expect(requests[0].body).toEqual({ status: 'paused' });

    await run('create_ad_creative');
    expect(requests[1].body).toMatchObject({ adAccountId: 'act_1', urlTags: 'utm_source=meta' });
  });

  it('sends the insights range, breakdown and daily flag as query params', async () => {
    await run('get_ad_object_insights');
    const url = new URL(requests[0].url);
    expect(url.pathname).toBe('/v1/ads/insights');
    expect(Object.fromEntries(url.searchParams)).toEqual({
      connection_id: UUID,
      object_id: '120',
      since: '2026-09-01',
      until: '2026-09-07',
      breakdown: 'age',
      daily: 'true',
    });
  });

  it('pages the leads feed with the cursor in the query', async () => {
    await run('list_leads_feed');
    const url = new URL(requests[0].url);
    expect(url.pathname).toBe('/v1/ads/leads');
    expect(Object.fromEntries(url.searchParams)).toEqual({
      workspace_id: UUID,
      form_id: 'f1',
      cursor: 'next1',
      limit: '50',
    });
  });

  it('unwraps a { data } response', async () => {
    const tool = allTools().find((t) => t.name === 'get_inbox_unread_count')!;
    globalThis.fetch = (async () =>
      new Response(JSON.stringify({ count: 3 }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })) as unknown as typeof fetch;
    expect(await tool.execute({})).toEqual({ count: 3 });

    const ads = allTools().find((t) => t.name === 'list_ads')!;
    globalThis.fetch = (async () =>
      new Response(JSON.stringify({ data: [{ id: UUID, status: 'paused' }] }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })) as unknown as typeof fetch;
    expect(await ads.execute({ workspace_id: UUID })).toEqual([{ id: UUID, status: 'paused' }]);
  });
});

describe('account group requests', () => {
  function run(name: string, input: unknown = TOOL_INPUTS[name]) {
    const tool = allTools().find((t) => t.name === name)!;
    return tool.execute(tool.inputSchema.parse(input));
  }

  it('filters list_accounts by group_id', async () => {
    await run('list_accounts', { workspace_id: UUID, group_id: UUID });
    expect(new URL(requests[0].url).searchParams.get('group_id')).toBe(UUID);
  });

  it('renames an account with PATCH and a null display_name', async () => {
    await run('rename_account');
    expect(requests[0].method).toBe('PATCH');
    expect(new URL(requests[0].url).pathname).toBe(`/v1/accounts/${UUID}`);
    expect(requests[0].body).toEqual({ display_name: null });
  });

  it('sets the Slack identity with PATCH and a snake_case body', async () => {
    await run('set_slack_identity');
    expect(requests[0].method).toBe('PATCH');
    expect(new URL(requests[0].url).pathname).toBe(`/v1/accounts/${UUID}/slack/identity`);
    expect(requests[0].body).toEqual({ username: 'Launch Bot', icon_url: null });
  });

  it('replaces group members with PUT', async () => {
    await run('set_account_group_members');
    expect(requests[0].method).toBe('PUT');
    expect(new URL(requests[0].url).pathname).toBe(`/v1/account-groups/${UUID}/members`);
    expect(requests[0].body).toEqual({ account_ids: [UUID] });
  });

  it('schedules a post to a group without account_ids', async () => {
    await run('schedule_post', { workspace_id: UUID, content: 'hi', account_group_id: UUID });
    expect(requests[0].body).toMatchObject({ account_group_id: UUID });
    expect(requests[0].body).not.toHaveProperty('accounts');
  });

  it('exposes no tool that moves an account between workspaces', () => {
    expect(allTools().some((t) => /move/.test(t.name))).toBe(false);
  });
});

describe('telegram requests', () => {
  function run(name: string, input: unknown = TOOL_INPUTS[name]) {
    const tool = allTools().find((t) => t.name === name)!;
    return tool.execute(tool.inputSchema.parse(input));
  }

  it('mints a connect code with a camelCase workspaceId body', async () => {
    await run('create_telegram_connect_code');
    expect(requests[0].method).toBe('POST');
    expect(new URL(requests[0].url).pathname).toBe('/v1/accounts/telegram/connect-code');
    expect(requests[0].body).toEqual({ workspaceId: UUID });
  });

  it('reads the connect status by code in the query', async () => {
    await run('get_telegram_connect_status');
    const url = new URL(requests[0].url);
    expect(url.pathname).toBe('/v1/accounts/telegram/connect-code/status');
    expect(url.searchParams.get('code')).toBe('abc123');
  });

  it('replaces bot commands with PUT and clears them with DELETE', async () => {
    await run('set_telegram_bot_commands');
    await run('clear_telegram_bot_commands');
    expect(requests[0].method).toBe('PUT');
    expect(new URL(requests[0].url).pathname).toBe(`/v1/accounts/${UUID}/telegram/commands`);
    expect(requests[0].body).toEqual({ commands: [{ command: 'help', description: 'Show help' }] });
    expect(requests[1].method).toBe('DELETE');
  });

  it('rejects a command with a leading slash', () => {
    const tool = allTools().find((t) => t.name === 'set_telegram_bot_commands')!;
    expect(() =>
      tool.inputSchema.parse({
        account_id: UUID,
        commands: [{ command: '/help', description: 'Show help' }],
      }),
    ).toThrow();
  });
});
