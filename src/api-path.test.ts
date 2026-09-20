import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { FoPostClient } from './client.js';
import { postsTools } from './tools/posts.js';
import { accountsTools } from './tools/accounts.js';
import { aiTools } from './tools/ai.js';
import { inboxTools } from './tools/inbox.js';
import { contactsTools } from './tools/contacts.js';
import { broadcastsTools } from './tools/broadcasts.js';
import { adsTools } from './tools/ads.js';
import { knowledgeTools } from './tools/knowledge.js';
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
  get_messaging_setting: { account_id: UUID, setting: 'ice_breakers' },
  set_ice_breakers: {
    account_id: UUID,
    ice_breakers: [{ question: 'What are your hours?', payload: 'HOURS' }],
  },
  set_persistent_menu: {
    account_id: UUID,
    call_to_actions: [{ type: 'postback', title: 'Talk to Us', payload: 'HUMAN' }],
  },
  set_greeting: { account_id: UUID, text: 'Hi! Ask us anything.' },
  clear_messaging_setting: { account_id: UUID, setting: 'greeting' },
  get_webhook_subscription: { account_id: UUID },
  resubscribe_webhook: { account_id: UUID },
  list_discord_channels: { account_id: UUID },
  switch_discord_channel: { account_id: UUID, channel_id: '100000000000000002' },
  get_discord_identity: { account_id: UUID },
  set_discord_identity: { account_id: UUID, username: 'Release Bot', avatar_url: null },
  list_discord_pins: { account_id: UUID },
  manage_discord_message: { account_id: UUID, message_id: '100000000000000003', action: 'pin' },
  send_discord_dm: { account_id: UUID, member_id: '100000000000000004', content: 'hi' },
  list_discord_events: { account_id: UUID },
  create_discord_event: {
    account_id: UUID,
    name: 'Launch stream',
    start_time: '2026-10-01T18:00:00.000Z',
    end_time: '2026-10-01T19:00:00.000Z',
    location: 'https://example.com/live',
  },
  update_discord_event: { account_id: UUID, event_id: '100000000000000005', status: 'canceled' },
  delete_discord_event: { account_id: UUID, event_id: '100000000000000005' },
  list_discord_members: { account_id: UUID, query: 'ada' },
  list_discord_roles: { account_id: UUID },
  create_discord_role: { account_id: UUID, name: 'Beta' },
  assign_discord_role: {
    account_id: UUID,
    role_id: '100000000000000006',
    member_id: '100000000000000004',
    action: 'add',
  },
  generate_caption: { current_caption: 'hi' },
  rewrite_for_platforms: { content: 'hi', platforms: ['twitter'] },
  repurpose_url: { url: 'https://example.com', platforms: ['twitter'] },
  get_ai_credits: {},
  list_contacts: { workspace_id: UUID },
  get_contact: { id: UUID },
  create_contact: {
    workspace_id: UUID,
    channels: [{ platform: 'x', handle: 'ada_writes' }],
    display_name: 'Ada Okafor',
  },
  update_contact: { id: UUID, display_name: 'Ada O.', fields: { plan_tier: 'Pro' } },
  delete_contact: { id: UUID },
  list_contact_conversations: { id: UUID },
  import_contacts: { workspace_id: UUID, csv: 'platform,handle\nx,ada_writes\n' },
  list_contact_fields: { workspace_id: UUID },
  list_broadcasts: { workspace_id: UUID },
  get_broadcast: { id: UUID },
  create_broadcast: {
    workspace_id: UUID,
    account_id: UUID,
    name: 'September check-in',
    text: 'New colours just landed.',
    audience: { platforms: ['instagram'] },
  },
  update_broadcast: { id: UUID, text: 'New colours just landed.' },
  send_broadcast: { id: UUID },
  cancel_broadcast: { id: UUID },
  list_broadcast_recipients: { id: UUID, status: 'skipped' },
  delete_broadcast: { id: UUID },
  list_sequences: { workspace_id: UUID },
  get_sequence: { id: UUID },
  create_sequence: {
    workspace_id: UUID,
    account_id: UUID,
    name: 'Welcome',
    steps: [{ delay_hours: 0, text: 'Thanks for the follow' }],
  },
  update_sequence: { id: UUID, status: 'paused' },
  enroll_in_sequence: { id: UUID, contact_ids: [UUID] },
  unenroll_from_sequence: { id: UUID, contact_ids: [UUID] },
  list_sequence_enrollments: { id: UUID },
  delete_sequence: { id: UUID },
  create_contact_field: {
    workspace_id: UUID,
    key: 'plan_tier',
    name: 'Plan Tier',
    type: 'select',
    options: ['Free', 'Pro'],
  },
  update_contact_field: { id: UUID, name: 'Tier' },
  delete_contact_field: { id: UUID },
  get_conversation_analytics: { workspace_id: UUID, days: 30, sort: 'slowest' },
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
  handover_conversation: { conversation_id: 'c1', account_id: UUID, app_id: '263902037430900' },
  list_inbox_approvals: { workspace_id: UUID },
  approve_inbox_reply: { id: 7, text: 'hi' },
  reject_inbox_reply: { id: 7 },
  refresh_inbox: { workspace_id: UUID },
  list_ads: { workspace_id: UUID },
  list_external_ads: {},
  list_boostable_posts: {},
  list_ad_goals: { connection_id: UUID },
  list_ad_catalogs: { connection_id: UUID },
  create_ad_catalog: { workspace_id: UUID, connection_id: UUID, name: 'Shop' },
  list_catalog_products: { connection_id: UUID, catalog_id: '500' },
  write_catalog_products: {
    workspace_id: UUID,
    connection_id: UUID,
    catalog_id: '500',
    products: [
      {
        op: 'upsert',
        retailer_id: 'SKU-1',
        name: 'Trail Runner',
        url: 'https://yourbrand.com/shop/trail-runner',
        image_url: 'https://yourbrand.com/img/trail-runner.jpg',
        price_minor: 12_900,
        currency: 'USD',
      },
    ],
  },
  list_catalog_product_sets: { connection_id: UUID, catalog_id: '500' },
  create_catalog_product_set: {
    workspace_id: UUID,
    connection_id: UUID,
    catalog_id: '500',
    name: 'Best sellers',
  },
  list_reach_frequency: { connection_id: UUID, ad_account_id: 'act_1' },
  search_ad_library: { connection_id: UUID, countries: ['US'], q: 'shoes' },
  list_ad_account_activity: { connection_id: UUID, ad_account_id: 'act_1' },
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
  search_knowledge: { q: 'how long do refunds take?', top_k: 3 },
  list_knowledge_sources: { workspace_id: UUID },
  create_knowledge_source: { kind: 'faq', title: 'Refunds', content: 'Q: ...\nA: 30 days.' },
  update_knowledge_source: { id: UUID, title: 'Refunds and returns' },
  sync_knowledge_source: { id: UUID },
  delete_knowledge_source: { id: UUID },
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
    ...contactsTools(client),
    ...broadcastsTools(client),
    ...adsTools(client),
    ...knowledgeTools(client),
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

describe('contacts requests', () => {
  function run(name: string) {
    const tool = allTools().find((t) => t.name === name)!;
    return tool.execute(tool.inputSchema.parse(TOOL_INPUTS[name]));
  }

  it('sends the contact filters as snake_case query params', async () => {
    await run('list_contacts');
    const url = new URL(requests[0].url);
    expect(url.pathname).toBe('/v1/contacts');
    expect(url.searchParams.get('workspace_id')).toBe(UUID);
  });

  it('patches a contact rather than replacing it', async () => {
    await run('update_contact');
    expect(requests[0].method).toBe('PATCH');
    expect(new URL(requests[0].url).pathname).toBe(`/v1/contacts/${UUID}`);
    expect(requests[0].body).toEqual({ display_name: 'Ada O.', fields: { plan_tier: 'Pro' } });
  });

  it('carries the workspace on a field create, which the API reads from the query', async () => {
    await run('create_contact_field');
    const url = new URL(requests[0].url);
    expect(requests[0].method).toBe('POST');
    expect(url.pathname).toBe('/v1/contacts/fields');
    expect(url.searchParams.get('workspace_id')).toBe(UUID);
  });

  it('reads per-conversation analytics under analytics, not under contacts', async () => {
    await run('get_conversation_analytics');
    expect(new URL(requests[0].url).pathname).toBe('/v1/analytics/inbox/conversations');
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

  it('switches the Discord channel with PATCH', async () => {
    await run('switch_discord_channel');
    expect(requests[0].method).toBe('PATCH');
    expect(new URL(requests[0].url).pathname).toBe(`/v1/accounts/${UUID}/discord/channels/current`);
    expect(requests[0].body).toEqual({ channel_id: '100000000000000002' });
  });

  it('routes each manage_discord_message action to its own request', async () => {
    await run('manage_discord_message', {
      account_id: UUID,
      message_id: '100000000000000003',
      action: 'pin',
    });
    await run('manage_discord_message', {
      account_id: UUID,
      message_id: '100000000000000003',
      action: 'unpin',
    });
    await run('manage_discord_message', {
      account_id: UUID,
      message_id: '100000000000000003',
      action: 'delete',
    });
    await run('manage_discord_message', {
      account_id: UUID,
      message_id: '100000000000000003',
      action: 'thread',
      thread_name: 'Launch chat',
    });

    const base = `/v1/accounts/${UUID}/discord/messages/100000000000000003`;
    expect(requests.map((r) => `${r.method} ${new URL(r.url).pathname}`)).toEqual([
      `POST ${base}/pin`,
      `DELETE ${base}/pin`,
      `DELETE ${base}`,
      `POST ${base}/thread`,
    ]);
    expect(requests[3].body).toEqual({ name: 'Launch chat' });
  });

  it('sends a Discord event body in snake_case and a member search as q', async () => {
    await run('create_discord_event');
    expect(new URL(requests[0].url).pathname).toBe(`/v1/accounts/${UUID}/discord/events`);
    expect(requests[0].body).toMatchObject({
      name: 'Launch stream',
      start_time: '2026-10-01T18:00:00.000Z',
      location: 'https://example.com/live',
    });

    await run('list_discord_members');
    expect(new URL(requests[1].url).searchParams.get('q')).toBe('ada');
  });

  it('assigns and unassigns a Discord role on the same path', async () => {
    await run('assign_discord_role');
    await run('assign_discord_role', {
      account_id: UUID,
      role_id: '100000000000000006',
      member_id: '100000000000000004',
      action: 'remove',
    });

    const path = `/v1/accounts/${UUID}/discord/roles/100000000000000006/members/100000000000000004`;
    expect(requests.map((r) => `${r.method} ${new URL(r.url).pathname}`)).toEqual([
      `PUT ${path}`,
      `DELETE ${path}`,
    ]);
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

  it('reads, replaces and clears each messaging setting on its own path', async () => {
    await run('get_messaging_setting');
    expect(requests[0].method).toBe('GET');
    expect(new URL(requests[0].url).pathname).toBe(`/v1/accounts/${UUID}/messaging/ice-breakers`);

    await run('set_ice_breakers');
    expect(requests[1].method).toBe('PUT');
    expect(requests[1].body).toEqual({
      ice_breakers: [{ question: 'What are your hours?', payload: 'HOURS' }],
    });

    await run('set_persistent_menu');
    expect(new URL(requests[2].url).pathname).toBe(
      `/v1/accounts/${UUID}/messaging/persistent-menu`,
    );
    // The tool takes a flat item list and wraps it in the default-locale entry.
    expect(requests[2].body).toEqual({
      persistent_menu: [
        {
          locale: 'default',
          call_to_actions: [{ type: 'postback', title: 'Talk to Us', payload: 'HUMAN' }],
        },
      ],
    });

    await run('set_greeting');
    expect(requests[3].body).toEqual({
      greeting: [{ locale: 'default', text: 'Hi! Ask us anything.' }],
    });

    await run('clear_messaging_setting');
    expect(requests[4].method).toBe('DELETE');
    expect(new URL(requests[4].url).pathname).toBe(`/v1/accounts/${UUID}/messaging/greeting`);
  });

  it('reports and re-subscribes the webhook on one path', async () => {
    await run('get_webhook_subscription');
    await run('resubscribe_webhook');
    expect(requests[0].method).toBe('GET');
    expect(new URL(requests[0].url).pathname).toBe(`/v1/accounts/${UUID}/webhook-subscription`);
    expect(requests[1].method).toBe('POST');
    expect(new URL(requests[1].url).pathname).toBe(`/v1/accounts/${UUID}/webhook-subscription`);
  });

  it('hands a Messenger thread over, and takes it back without an app id', async () => {
    await run('handover_conversation');
    expect(new URL(requests[0].url).pathname).toBe('/v1/inbox/conversations/c1/handover');
    expect(requests[0].body).toEqual({ account_id: UUID, app_id: '263902037430900' });

    await run('handover_conversation', { conversation_id: 'c1', account_id: UUID });
    expect(requests[1].body).toEqual({ account_id: UUID });
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
