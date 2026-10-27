import { z } from 'zod';
import { seg, type FoPostClient } from '../client.js';
import type { ToolDefinition } from '../types.js';

const WEBHOOK_EVENTS = [
  'post.scheduled',
  'post.published',
  'post.partially_failed',
  'post.failed',
  'post.deleted',
  'delivery.published',
  'delivery.failed',
  'delivery.delayed',
  'account.connected',
  'account.disconnected',
  'account.health_changed',
  'article.published',
  'inbox.comment_received',
  'inbox.mention_received',
  'inbox.message_received',
  'inbox.review_received',
  'automation.triggered',
  'automation.completed',
  'automation.failed',
] as const;

const eventsSchema = z.array(z.enum(WEBHOOK_EVENTS)).min(1).describe('Events to subscribe to');
const secretSchema = z.string().min(16).max(255);
const headerValue = z.string().min(1).max(1024);
const httpsUrl = z
  .string()
  .url()
  .max(2048)
  .refine((v) => /^https:\/\//i.test(v), 'Webhook url must use https');

/** Every tool here needs the `webhooks` scope. */
export function webhooksTools(client: FoPostClient): ToolDefinition[] {
  return [
    {
      name: 'list_webhooks',
      description:
        'List the webhooks the key can reach, with their events, whether each is active, when it last fired and its failure count.',
      inputSchema: z.object({}),
      async execute() {
        return client.get('/v1/webhooks');
      },
    },

    {
      name: 'create_webhook',
      description:
        'Register an HTTPS endpoint for workspace events. The signing secret is returned only in this response, so store it to verify payloads.',
      inputSchema: z.object({
        workspace_id: z.string().uuid().describe('Workspace id (uuid)'),
        url: httpsUrl.describe('HTTPS endpoint on a public host'),
        events: eventsSchema,
        name: z.string().min(1).max(120).optional().describe('A label for the endpoint'),
        secret: secretSchema.optional().describe('Signing secret; omit to have one generated'),
        headers: z
          .record(headerValue)
          .optional()
          .describe('Custom headers sent with every delivery; values are never returned'),
      }),
      async execute(input) {
        return client.post('/v1/webhooks', {
          workspaceId: input.workspace_id,
          name: input.name,
          url: input.url,
          events: input.events,
          secret: input.secret,
          headers: input.headers,
        });
      },
    },

    {
      name: 'update_webhook',
      description:
        'Change a webhook: its name, url, events, headers or active flag, or rotate its secret. Re-enabling it resets the failure count. Only provided fields change.',
      inputSchema: z.object({
        id: z.string().uuid().describe('Webhook id (uuid)'),
        name: z.string().min(1).max(120).nullable().optional(),
        url: httpsUrl.optional(),
        events: eventsSchema.optional(),
        active: z.boolean().optional(),
        secret: secretSchema.optional().describe('Rotates the signing secret; returned once'),
        headers: z
          .record(headerValue.nullable())
          .nullable()
          .optional()
          .describe(
            'Replaces the header set; null keeps an existing value, a top-level null clears every header',
          ),
      }),
      async execute(input) {
        const body: Record<string, unknown> = {};
        if (input.name !== undefined) body.name = input.name;
        if (input.url !== undefined) body.url = input.url;
        if (input.events !== undefined) body.events = input.events;
        if (input.active !== undefined) body.active = input.active;
        if (input.secret !== undefined) body.secret = input.secret;
        if (input.headers !== undefined) body.headers = input.headers;
        return client.put(`/v1/webhooks/${seg(input.id)}`, body);
      },
    },

    {
      name: 'delete_webhook',
      description: 'Delete a webhook. Cannot be undone.',
      inputSchema: z.object({
        id: z.string().uuid().describe('Webhook id (uuid)'),
      }),
      async execute(input) {
        return client.delete(`/v1/webhooks/${seg(input.id)}`);
      },
    },

    {
      name: 'test_webhook',
      description:
        'Send a test post.published payload to one webhook, whatever it subscribes to. Use to check an endpoint before relying on it.',
      inputSchema: z.object({
        id: z.string().uuid().describe('Webhook id (uuid)'),
      }),
      async execute(input) {
        return client.post(`/v1/webhooks/${seg(input.id)}/test`);
      },
    },

    {
      name: 'list_webhook_deliveries',
      description:
        'List every delivery attempt to a webhook, newest first, with the response status and snippet each got. Attempts are kept for 30 days. Use for "why did my endpoint stop getting events".',
      inputSchema: z.object({
        id: z.string().uuid().describe('Webhook id (uuid)'),
        status: z.enum(['success', 'failed']).optional(),
        limit: z.number().int().min(1).max(200).optional(),
      }),
      async execute(input) {
        return client.get(`/v1/webhooks/${seg(input.id)}/deliveries`, {
          status: input.status,
          limit: input.limit,
        });
      },
    },

    {
      name: 'get_webhook_delivery',
      description: 'Read one delivery attempt, including the payload exactly as it was sent.',
      inputSchema: z.object({
        id: z.string().uuid().describe('Webhook id (uuid)'),
        delivery_id: z.string().uuid().describe('Delivery id (uuid)'),
      }),
      async execute(input) {
        return client.get(`/v1/webhooks/${seg(input.id)}/deliveries/${seg(input.delivery_id)}`);
      },
    },

    {
      name: 'redeliver_webhook_delivery',
      description:
        'Send a delivery again with the identical body and signature, logged as the next attempt. A paused webhook answers 409.',
      inputSchema: z.object({
        id: z.string().uuid().describe('Webhook id (uuid)'),
        delivery_id: z.string().uuid().describe('Delivery id (uuid)'),
      }),
      async execute(input) {
        return client.post(
          `/v1/webhooks/${seg(input.id)}/deliveries/${seg(input.delivery_id)}/redeliver`,
        );
      },
    },
  ];
}
