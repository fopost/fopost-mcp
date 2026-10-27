import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { UUID, TOOL_INPUTS, allTools } from './tool-fixtures.js';

/**
 * The API serves every route under /v1 on the bare host. A /api/v1 prefix
 * 404s, which is exactly how the published server shipped broken.
 */

let urls: string[];
let requests: { method: string; url: string; body: unknown }[];
let originalFetch: typeof globalThis.fetch;

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

  it('edits a live article in place instead of creating a second one', async () => {
    const tools = allTools();
    const update = tools.find((t) => t.name === 'update_article')!;
    await update.execute(update.inputSchema.parse(TOOL_INPUTS.update_article));

    const sent = requests.at(-1)!;
    // The article id is in the path, and the ids that address it never travel
    // in the body, so the site changes that row rather than adding one.
    expect(sent.method).toBe('PATCH');
    expect(new URL(sent.url).pathname).toBe(`/v1/accounts/${UUID}/blogs/11/articles/99`);
    expect(sent.body).toEqual({ title: 'Restocked' });
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

  it('reposts and bookmarks an X item with an empty POST, like a like', async () => {
    for (const [i, action] of ['repost', 'unrepost', 'bookmark', 'unbookmark'].entries()) {
      await run(`${action}_inbox_item`);
      expect(requests[i].method).toBe('POST');
      expect(new URL(requests[i].url).pathname).toBe(`/v1/inbox/${UUID}/${action}`);
      expect(requests[i].body).toBeUndefined();
    }
  });

  it('follows an X user with the numeric id in the body, and rejects a handle', async () => {
    await run('follow_x_user');
    expect(requests[0].method).toBe('POST');
    expect(new URL(requests[0].url).pathname).toBe(`/v1/accounts/${UUID}/x/follow`);
    expect(requests[0].body).toEqual({ user_id: '783214' });

    await run('unfollow_x_user');
    expect(new URL(requests[1].url).pathname).toBe(`/v1/accounts/${UUID}/x/unfollow`);
    expect(requests[1].body).toEqual({ user_id: '783214' });

    const follow = allTools().find((t) => t.name === 'follow_x_user')!;
    expect(() => follow.inputSchema.parse({ account_id: UUID, user_id: '@fopost' })).toThrow();
  });

  it('reads X posts with account_id in the query', async () => {
    await run('get_x_post');
    const lookup = new URL(requests[0].url);
    expect(requests[0].method).toBe('GET');
    expect(lookup.pathname).toBe('/v1/x/posts/1460323737035677698');
    expect(lookup.searchParams.get('account_id')).toBe(UUID);

    await run('search_x_posts');
    const search = new URL(requests[1].url);
    expect(search.pathname).toBe('/v1/x/search');
    expect(Object.fromEntries(search.searchParams)).toEqual({
      account_id: UUID,
      q: 'fopost',
      max_results: '25',
      next_token: 'b26v',
    });

    const tool = allTools().find((t) => t.name === 'search_x_posts')!;
    expect(() => tool.inputSchema.parse({ account_id: UUID, q: 'x', max_results: 5 })).toThrow();
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

describe('ads tracking requests', () => {
  function run(name: string) {
    const tool = allTools().find((t) => t.name === name)!;
    return tool.execute(tool.inputSchema.parse(TOOL_INPUTS[name]));
  }

  it('uploads conversions as a camelCase body with the new event fields', async () => {
    await run('upload_ad_conversions');
    expect(requests[0].method).toBe('POST');
    expect(new URL(requests[0].url).pathname).toBe('/v1/ads/conversions');
    const body = requests[0].body as { pixelId: string; events: Record<string, unknown>[] };
    expect(body.pixelId).toBe('px_1');
    expect(body.events[0]).toMatchObject({
      eventName: 'Purchase',
      eventId: 'ord_1',
      actionSource: 'website',
      externalId: 'u_1',
      clickId: 'fb.1.1',
      contentIds: ['sku_1'],
    });
    expect(body.events[0]).not.toHaveProperty('event_name');
  });

  it('reads a pixel with the account ids in the query', async () => {
    await run('get_pixel');
    const url = new URL(requests[0].url);
    expect(requests[0].method).toBe('GET');
    expect(url.pathname).toBe('/v1/ads/pixels/px_1');
    expect(url.searchParams.get('connection_id')).toBe(UUID);
    expect(url.searchParams.get('ad_account_id')).toBe('act_1');

    await run('get_pixel_stats');
    expect(new URL(requests[1].url).pathname).toBe('/v1/ads/pixels/px_1/stats');
    await run('get_event_match_quality');
    expect(new URL(requests[2].url).pathname).toBe('/v1/ads/pixels/px_1/match-quality');
  });

  it('patches a pixel with a camelCase body', async () => {
    await run('update_pixel');
    expect(requests[0].method).toBe('PATCH');
    expect(requests[0].body).toEqual({
      workspaceId: UUID,
      connectionId: UUID,
      adAccountId: 'act_1',
      dataUseSetting: 'analytics_only',
    });
  });

  it('creates a custom conversion with a camelCase body and rule', async () => {
    await run('create_custom_conversion');
    expect(requests[0].method).toBe('POST');
    expect(new URL(requests[0].url).pathname).toBe('/v1/ads/custom-conversions');
    expect(requests[0].body).toEqual({
      workspaceId: UUID,
      connectionId: UUID,
      adAccountId: 'act_1',
      pixelId: 'px_1',
      name: 'Checkout',
      eventType: 'PURCHASE',
      rule: { urlContains: '/thank-you' },
      defaultValueMinor: 4900,
    });
  });

  it('deletes a custom conversion with the account ids in the body', async () => {
    await run('delete_custom_conversion');
    expect(requests[0].method).toBe('DELETE');
    expect(new URL(requests[0].url).pathname).toBe('/v1/ads/custom-conversions/cc_1');
    expect(requests[0].body).toEqual({
      workspaceId: UUID,
      connectionId: UUID,
      adAccountId: 'act_1',
    });
  });

  it('lists sent batches with the filters in the query', async () => {
    await run('list_conversion_events');
    const url = new URL(requests[0].url);
    expect(url.pathname).toBe('/v1/ads/conversions/events');
    expect(url.searchParams.get('limit')).toBe('10');
  });

  it('exposes no tool for the idempotent send or pixel sharing', () => {
    const names = allTools().map((t) => t.name);
    expect(names).not.toContain('share_pixel');
    expect(allTools().filter((t) => t.name === 'send_conversion_events')).toHaveLength(1);
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

  it('sets the default subreddit with PUT and an explicit null', async () => {
    await run('set_reddit_default_subreddit');
    expect(requests[0].method).toBe('PUT');
    expect(new URL(requests[0].url).pathname).toBe(`/v1/accounts/${UUID}/reddit/default-subreddit`);
    expect(requests[0].body).toEqual({ subreddit: null });
  });

  it('reads flairs and checks a subreddit through the query string', async () => {
    await run('list_reddit_flairs');
    expect(new URL(requests[0].url).pathname).toBe(`/v1/accounts/${UUID}/reddit/flairs`);
    expect(new URL(requests[0].url).searchParams.get('subreddit')).toBe('webdev');

    await run('validate_subreddit');
    expect(new URL(requests[1].url).pathname).toBe('/v1/validate/subreddit');
    expect(new URL(requests[1].url).searchParams.get('account_id')).toBe(UUID);
    expect(new URL(requests[1].url).searchParams.get('name')).toBe('webdev');
  });

  it('votes with a direction in the body', async () => {
    await run('vote_inbox_item');
    expect(requests[0].method).toBe('POST');
    expect(new URL(requests[0].url).pathname).toBe(`/v1/inbox/${UUID}/vote`);
    expect(requests[0].body).toEqual({ direction: 'down' });
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

describe('google business requests', () => {
  function run(name: string, input: unknown = TOOL_INPUTS[name]) {
    const tool = allTools().find((t) => t.name === name)!;
    return tool.execute(tool.inputSchema.parse(input));
  }

  it('reads and patches the location on the same route', async () => {
    await run('get_google_business_location');
    await run('update_google_business_location');

    expect(new URL(requests[0].url).pathname).toBe(`/v1/accounts/${UUID}/gbp/location`);
    expect(requests[1].method).toBe('PATCH');
    expect(requests[1].body).toEqual({ title: 'Corner Bakery' });
  });

  it('names a photo by its media-library id, never a URL', async () => {
    await run('add_google_business_media');

    expect(requests[0].method).toBe('POST');
    expect(new URL(requests[0].url).pathname).toBe(`/v1/accounts/${UUID}/gbp/media`);
    expect(requests[0].body).toEqual({ media_id: UUID, category: 'INTERIOR' });
  });

  it('replaces menus and services with PUT, because Google has no partial patch', async () => {
    await run('replace_google_business_menus');
    await run('replace_google_business_services');

    expect(requests[0].method).toBe('PUT');
    expect(new URL(requests[0].url).pathname).toBe(`/v1/accounts/${UUID}/gbp/menus`);
    expect(requests[1].method).toBe('PUT');
    expect(new URL(requests[1].url).pathname).toBe(`/v1/accounts/${UUID}/gbp/services`);
  });

  it('asks the one performance route for the daily series and the keywords', async () => {
    await run('get_google_business_performance');
    await run('get_google_business_performance', {
      account_id: UUID,
      start_date: '2026-08-01',
      end_date: '2026-09-01',
      keywords: true,
    });

    expect(new URL(requests[0].url).pathname).toBe(`/v1/accounts/${UUID}/gbp/performance`);
    expect(new URL(requests[1].url).searchParams.get('keywords')).toBe('true');
  });

  it('exposes no tool that hands a location to another workspace', () => {
    const names = allTools()
      .map((t) => t.name)
      .filter((name) => name.includes('google_business'));
    expect(names.some((name) => /assign|move|transfer/.test(name))).toBe(false);
  });
});

describe('per-network metrics', () => {
  it('asks the insights route for the raw set', async () => {
    const tool = allTools().find((t) => t.name === 'get_account_platform_metrics')!;
    await tool.execute(tool.inputSchema.parse({ account_id: UUID }));

    const url = new URL(requests[0].url);
    expect(requests[0].method).toBe('GET');
    expect(url.pathname).toBe(`/v1/accounts/${UUID}/insights`);
    expect(url.searchParams.get('raw')).toBe('true');
  });
});

describe('blog requests', () => {
  function run(name: string, input: unknown = TOOL_INPUTS[name]) {
    const tool = allTools().find((t) => t.name === name)!;
    return tool.execute(tool.inputSchema.parse(input));
  }

  it('sends workspace_id on the query, and statuses comma-separated', async () => {
    await run('blog_list_keywords');
    const url = new URL(requests[0].url);
    expect(url.pathname).toBe('/v1/blog/keywords');
    expect(url.searchParams.get('workspace_id')).toBe(UUID);
    expect(url.searchParams.has('workspaceId')).toBe(false);
    expect(url.searchParams.get('status')).toBe('suggested,planned');
    expect(url.searchParams.get('limit')).toBe('50');
  });

  it('requests an article with a camelCase body and exactly one subject', async () => {
    await run('blog_request_article');
    expect(requests[0].method).toBe('POST');
    expect(new URL(requests[0].url).pathname).toBe('/v1/blog/articles');
    expect(requests[0].body).toEqual({
      workspaceId: UUID,
      keywordId: UUID,
      instructions: 'Keep it short',
    });

    const tool = allTools().find((t) => t.name === 'blog_request_article')!;
    expect(tool.inputSchema.safeParse({ workspace_id: UUID }).success).toBe(false);
    expect(
      tool.inputSchema.safeParse({ workspace_id: UUID, title: 'A', keyword: 'b' }).success,
    ).toBe(false);
    expect(tool.inputSchema.safeParse({ workspace_id: UUID, title: 'A' }).success).toBe(true);
  });

  it('publishes on the publish route with the workspace in the query, never in the body', async () => {
    await run('blog_publish_article');
    const url = new URL(requests[0].url);
    expect(requests[0].method).toBe('POST');
    expect(url.pathname).toBe(`/v1/blog/articles/${UUID}/publish`);
    expect(url.searchParams.get('workspace_id')).toBe(UUID);
    expect(requests[0].body).toEqual({});
  });

  it('suggests seeds with a camelCase body carrying the seeds and prompt', async () => {
    await run('blog_suggest_seeds');
    expect(requests[0].method).toBe('POST');
    expect(new URL(requests[0].url).pathname).toBe('/v1/blog/keywords/suggest');
    expect(requests[0].body).toEqual({
      workspaceId: UUID,
      seeds: ['social scheduling'],
      prompt: 'For agencies',
    });

    const tool = allTools().find((t) => t.name === 'blog_suggest_seeds')!;
    expect(
      tool.inputSchema.safeParse({ workspace_id: UUID, prompt: 'x'.repeat(501) }).success,
    ).toBe(false);
  });

  it('submits an article for approval with the workspace in the query', async () => {
    await run('blog_submit_article');
    const url = new URL(requests[0].url);
    expect(requests[0].method).toBe('POST');
    expect(url.pathname).toBe(`/v1/blog/articles/${UUID}/submit`);
    expect(url.searchParams.get('workspace_id')).toBe(UUID);
    expect(requests[0].body).toEqual({});
  });

  it('sends the goal and topics on settings and no longer accepts auto_publish', async () => {
    await run('blog_update_settings', {
      workspace_id: UUID,
      goal: 'leads',
      focus_topics: 'Scheduling',
      avoid_topics: null,
    });
    expect(requests[0].body).toEqual({
      workspaceId: UUID,
      goal: 'leads',
      focusTopics: 'Scheduling',
      avoidTopics: null,
    });

    const tool = allTools().find((t) => t.name === 'blog_update_settings')!;
    expect(tool.inputSchema.parse({ workspace_id: UUID, auto_publish: true })).not.toHaveProperty(
      'auto_publish',
    );
  });

  it('patches settings and an article with camelCase bodies, keeping an explicit null', async () => {
    await run('blog_update_settings');
    expect(requests[0].method).toBe('PATCH');
    expect(new URL(requests[0].url).pathname).toBe('/v1/blog/settings');
    expect(requests[0].body).toEqual({
      workspaceId: UUID,
      cadencePerWeek: 2,
      targetKind: 'website',
    });

    await run('blog_update_article');
    expect(requests[1].method).toBe('PATCH');
    expect(new URL(requests[1].url).pathname).toBe(`/v1/blog/articles/${UUID}`);
    expect(new URL(requests[1].url).searchParams.get('workspace_id')).toBe(UUID);
    expect(requests[1].body).toEqual({ title: 'New title', publishAt: null });
  });

  it('exposes no tool that rotates the website secret or sends a test article', () => {
    const names = allTools().map((t) => t.name);
    expect(names.some((n) => /secret|test_website|website_test/.test(n))).toBe(false);
    expect(names.filter((n) => n.startsWith('blog_'))).toHaveLength(17);
  });

  it('never calls an article a post', () => {
    for (const tool of allTools().filter((t) => t.name.startsWith('blog_'))) {
      expect(tool.description).not.toMatch(/\bposts?\b(?! scope)/i);
    }
  });
});
