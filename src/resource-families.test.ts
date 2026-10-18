import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { FoPostClient } from './client.js';
import { postsTools } from './tools/posts.js';
import { connectSessionsTools } from './tools/connect-sessions.js';
import { webhooksTools } from './tools/webhooks.js';
import { queueTools } from './tools/queue.js';
import { automationsTools } from './tools/automations.js';
import type { ToolDefinition } from './types.js';

/**
 * One test per resource family added in 0.6.0: verb, path, body and the
 * payload handed back, against a stubbed fetch that never reaches the API.
 */
const UUID = '9b2f6c1e-0000-4000-8000-000000000001';
const OTHER = '9b2f6c1e-0000-4000-8000-000000000002';
const BASE = 'https://api.fopost.com';

type Call = { method: string; url: string; body: unknown };
let calls: Call[];
let originalFetch: typeof globalThis.fetch;
let respond: () => unknown;

function tools(): ToolDefinition[] {
  const client = new FoPostClient({ apiKey: 'test-key', baseUrl: BASE });
  return [
    ...postsTools(client),
    ...connectSessionsTools(client),
    ...webhooksTools(client),
    ...queueTools(client),
    ...automationsTools(client),
  ];
}

function run(name: string, input: unknown) {
  const tool = tools().find((t) => t.name === name)!;
  return tool.execute(tool.inputSchema.parse(input));
}

beforeEach(() => {
  calls = [];
  respond = () => ({ data: { id: UUID } });
  originalFetch = globalThis.fetch;
  globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
    calls.push({
      method: init?.method ?? 'GET',
      url: String(input),
      body: typeof init?.body === 'string' ? JSON.parse(init.body) : undefined,
    });
    return new Response(JSON.stringify(respond()), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  }) as unknown as typeof fetch;
});

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe('connect sessions', () => {
  it('creates a session with a camelCase body and polls it by id', async () => {
    const session = {
      id: UUID,
      status: 'pending',
      external_user_id: 'user-42',
      platforms: ['linkedin', 'threads'],
      redirect_url: 'https://yourbrand.com/connected',
      branding: { name: 'Your Brand', logo_url: 'https://yourbrand.com/logo.png' },
      account_id: null,
      url: 'https://fopost.com/connect/abc',
      expires_at: '2026-10-18T11:00:00.000Z',
      used_at: null,
      created_at: '2026-10-18T10:00:00.000Z',
    };
    respond = () => ({ data: session });

    const created = await run('create_connect_session', {
      workspace_id: OTHER,
      external_user_id: 'user-42',
      platforms: ['linkedin', 'threads'],
      redirect_url: 'https://yourbrand.com/connected',
      branding: { name: 'Your Brand', logo_url: 'https://yourbrand.com/logo.png' },
    });
    expect(calls[0]).toEqual({
      method: 'POST',
      url: `${BASE}/v1/connect-sessions`,
      body: {
        workspaceId: OTHER,
        externalUserId: 'user-42',
        platforms: ['linkedin', 'threads'],
        redirectUrl: 'https://yourbrand.com/connected',
        branding: { name: 'Your Brand', logoUrl: 'https://yourbrand.com/logo.png' },
      },
    });
    expect(created).toEqual(session);

    respond = () => ({ data: { ...session, status: 'used', account_id: OTHER } });
    const polled = await run('get_connect_session', { id: UUID });
    expect(calls[1]).toMatchObject({ method: 'GET', url: `${BASE}/v1/connect-sessions/${UUID}` });
    expect(polled).toMatchObject({ status: 'used', account_id: OTHER });
  });
});

describe('webhooks and deliveries', () => {
  it('sends the CRUD, test and delivery requests to their routes', async () => {
    const webhook = {
      id: UUID,
      workspace_id: OTHER,
      name: 'Orders',
      url: 'https://yourbrand.com/hooks/fopost',
      secret: 'whsec_0123456789abcdef',
      events: ['post.published', 'delivery.failed'],
      header_names: ['X-Env'],
      active: true,
      last_triggered_at: null,
      failure_count: 0,
      created_at: '2026-10-18T10:00:00.000Z',
    };
    respond = () => ({ data: webhook });
    const created = await run('create_webhook', {
      workspace_id: OTHER,
      name: 'Orders',
      url: 'https://yourbrand.com/hooks/fopost',
      events: ['post.published', 'delivery.failed'],
      headers: { 'X-Env': 'prod' },
    });
    expect(calls[0]).toEqual({
      method: 'POST',
      url: `${BASE}/v1/webhooks`,
      body: {
        workspaceId: OTHER,
        name: 'Orders',
        url: 'https://yourbrand.com/hooks/fopost',
        events: ['post.published', 'delivery.failed'],
        headers: { 'X-Env': 'prod' },
      },
    });
    expect(created).toEqual(webhook);

    respond = () => ({ data: [webhook] });
    expect(await run('list_webhooks', {})).toEqual([webhook]);
    expect(calls[1]).toMatchObject({ method: 'GET', url: `${BASE}/v1/webhooks` });

    respond = () => ({ data: { ...webhook, active: false, secret: undefined } });
    await run('update_webhook', { id: UUID, active: false, headers: null });
    expect(calls[2]).toEqual({
      method: 'PUT',
      url: `${BASE}/v1/webhooks/${UUID}`,
      body: { active: false, headers: null },
    });

    respond = () => ({ data: { success: true } });
    await run('test_webhook', { id: UUID });
    expect(calls[3]).toMatchObject({ method: 'POST', url: `${BASE}/v1/webhooks/${UUID}/test` });

    const delivery = {
      id: OTHER,
      webhook_id: UUID,
      event: 'post.published',
      delivery_key: 'dlv_1',
      attempt: 1,
      status: 'failed',
      response_status: 502,
      response_snippet: 'bad gateway',
      duration_ms: 120,
      payload_hash: 'abc',
      next_retry_at: null,
      created_at: '2026-10-18T10:05:00.000Z',
    };
    respond = () => ({ data: [delivery] });
    expect(await run('list_webhook_deliveries', { id: UUID, status: 'failed', limit: 10 })).toEqual(
      [delivery],
    );
    expect(calls[4]).toMatchObject({
      method: 'GET',
      url: `${BASE}/v1/webhooks/${UUID}/deliveries?status=failed&limit=10`,
    });

    respond = () => ({ data: { ...delivery, payload: { event: 'post.published' } } });
    const one = await run('get_webhook_delivery', { id: UUID, delivery_id: OTHER });
    expect(calls[5]).toMatchObject({
      method: 'GET',
      url: `${BASE}/v1/webhooks/${UUID}/deliveries/${OTHER}`,
    });
    expect(one).toMatchObject({ payload: { event: 'post.published' } });

    respond = () => ({ data: { ...delivery, attempt: 2, status: 'success' } });
    const again = await run('redeliver_webhook_delivery', { id: UUID, delivery_id: OTHER });
    expect(calls[6]).toMatchObject({
      method: 'POST',
      url: `${BASE}/v1/webhooks/${UUID}/deliveries/${OTHER}/redeliver`,
    });
    expect(again).toMatchObject({ attempt: 2, status: 'success' });

    respond = () => ({ data: { deleted: true } });
    await run('delete_webhook', { id: UUID });
    expect(calls[7]).toMatchObject({ method: 'DELETE', url: `${BASE}/v1/webhooks/${UUID}` });
  });
});

describe('posting queue', () => {
  it('manages slots, reads the next time and previews, and queues a post', async () => {
    const slot = {
      id: UUID,
      workspace_id: OTHER,
      account_id: null,
      weekday: 1,
      time: '09:00',
      timezone: 'Europe/Berlin',
      created_at: '2026-10-18T10:00:00.000Z',
    };
    respond = () => ({ data: slot });
    const created = await run('create_queue_slot', {
      workspace_id: OTHER,
      weekday: 1,
      time: '09:00',
      timezone: 'Europe/Berlin',
    });
    expect(calls[0]).toEqual({
      method: 'POST',
      url: `${BASE}/v1/queue/slots`,
      body: { workspace_id: OTHER, weekday: 1, time: '09:00', timezone: 'Europe/Berlin' },
    });
    expect(created).toEqual(slot);

    respond = () => ({ data: [slot] });
    expect(await run('list_queue_slots', { workspace_id: OTHER })).toEqual([slot]);
    expect(calls[1]).toMatchObject({
      method: 'GET',
      url: `${BASE}/v1/queue/slots?workspace_id=${OTHER}`,
    });

    respond = () => ({ ...slot, time: '10:30', moved: [] });
    const updated = await run('update_queue_slot', { id: UUID, time: '10:30', account_id: null });
    expect(calls[2]).toEqual({
      method: 'PUT',
      url: `${BASE}/v1/queue/slots/${UUID}`,
      body: { account_id: null, time: '10:30' },
    });
    expect(updated).toMatchObject({ time: '10:30', moved: [] });

    respond = () => ({ next: '2026-10-19T07:00:00.000Z' });
    expect(await run('get_queue_next', { workspace_id: OTHER, account_id: UUID })).toEqual({
      next: '2026-10-19T07:00:00.000Z',
    });
    expect(calls[3]).toMatchObject({
      method: 'GET',
      url: `${BASE}/v1/queue/next?workspace_id=${OTHER}&account_id=${UUID}`,
    });

    respond = () => ({ data: ['2026-10-19T07:00:00.000Z', '2026-10-26T07:00:00.000Z'] });
    expect(await run('preview_queue', { workspace_id: OTHER, count: 2 })).toHaveLength(2);
    expect(calls[4]).toMatchObject({
      method: 'GET',
      url: `${BASE}/v1/queue/preview?workspace_id=${OTHER}&count=2`,
    });

    respond = () => ({ deleted: true, moved: [] });
    expect(await run('delete_queue_slot', { id: UUID })).toEqual({ deleted: true, moved: [] });
    expect(calls[5]).toMatchObject({ method: 'DELETE', url: `${BASE}/v1/queue/slots/${UUID}` });

    respond = () => ({ data: { id: UUID } });
    await run('schedule_post', {
      workspace_id: OTHER,
      content: 'hi',
      account_ids: [UUID],
      schedule: 'queue',
    });
    expect(calls[6]).toMatchObject({
      method: 'POST',
      url: `${BASE}/v1/posts`,
      body: { schedule: 'queue', status: 'draft' },
    });

    await run('edit_post', { id: UUID, schedule: 'queue' });
    expect(calls[7]).toEqual({
      method: 'PUT',
      url: `${BASE}/v1/posts/${UUID}`,
      body: { schedule: 'queue' },
    });
  });
});

describe('unpublish', () => {
  it('posts to /unpublish and returns the per-network removals', async () => {
    const result = {
      post_status: 'unpublished',
      deliveries: [{ account_id: OTHER, platform: 'linkedin', removed: true }],
    };
    respond = () => result;
    expect(await run('unpublish_post', { id: UUID })).toEqual(result);
    expect(calls[0]).toEqual({
      method: 'POST',
      url: `${BASE}/v1/posts/${UUID}/unpublish`,
      body: undefined,
    });
  });
});

describe('automation versions', () => {
  it('lists, reads and restores versions, and reaches the automation itself', async () => {
    respond = () => ({ data: [{ id: UUID, name: 'Repost winners', active: true }] });
    expect(await run('list_automations', {})).toEqual([
      { id: UUID, name: 'Repost winners', active: true },
    ]);
    expect(calls[0]).toMatchObject({ method: 'GET', url: `${BASE}/v1/automations` });

    respond = () => ({ data: { id: UUID, name: 'Repost winners' } });
    expect(await run('get_automation', { id: UUID })).toEqual({ id: UUID, name: 'Repost winners' });
    expect(calls[1]).toMatchObject({ method: 'GET', url: `${BASE}/v1/automations/${UUID}` });

    const page = {
      data: [
        {
          version: 2,
          note: null,
          created_by: { name: 'Team' },
          created_at: '2026-10-18T10:00:00.000Z',
          node_count: 3,
          nodes_added: [],
          nodes_removed: [],
        },
      ],
      meta: { page: 1, per_page: 30, total: 2, total_pages: 1 },
    };
    respond = () => page;
    expect(await run('list_automation_versions', { id: UUID, page: 1, per_page: 30 })).toEqual(
      page,
    );
    expect(calls[2]).toMatchObject({
      method: 'GET',
      url: `${BASE}/v1/automations/${UUID}/versions?page=1&per_page=30`,
    });

    const version = { version: 2, note: null, graph: { nodes: [], edges: [] } };
    respond = () => ({ data: version });
    expect(await run('get_automation_version', { id: UUID, version: 2 })).toEqual(version);
    expect(calls[3]).toMatchObject({
      method: 'GET',
      url: `${BASE}/v1/automations/${UUID}/versions/2`,
    });

    respond = () => ({ data: { version: 3, graph: { nodes: [], edges: [] }, steps: [] } });
    const restored = await run('restore_automation_version', { id: UUID, version: 2 });
    expect(calls[4]).toEqual({
      method: 'POST',
      url: `${BASE}/v1/automations/${UUID}/versions/2/restore`,
      body: undefined,
    });
    expect(restored).toMatchObject({ version: 3 });
  });
});
