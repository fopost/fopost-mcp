import { z } from 'zod';
import type { OwlStackClient } from '../client.js';
import type { ToolDefinition } from '../types.js';

export function postsTools(client: OwlStackClient): ToolDefinition[] {
  return [
    {
      name: 'list_posts',
      description:
        'List posts in a workspace. Filter by status (draft, scheduled, published, failed) and pagination. Returns content, scheduled time, target accounts, and delivery status.',
      inputSchema: z.object({
        workspace_id: z.string().uuid().describe('Workspace id (uuid) to list posts from'),
        status: z
          .enum(['draft', 'pending_approval', 'scheduled', 'published', 'failed', 'cancelled'])
          .optional()
          .describe('Filter by post status'),
        limit: z.number().int().min(1).max(100).default(20),
        offset: z.number().int().min(0).default(0),
      }),
      async execute(input) {
        return client.get('/api/v1/posts', {
          workspace_id: input.workspace_id,
          status: input.status,
          limit: input.limit,
          offset: input.offset,
        });
      },
    },

    {
      name: 'get_post',
      description: 'Fetch a single post by id with full content, settings, and delivery records.',
      inputSchema: z.object({
        id: z.string().uuid().describe('Post id (uuid)'),
      }),
      async execute(input) {
        return client.get(`/api/v1/posts/${input.id}`);
      },
    },

    {
      name: 'schedule_post',
      description:
        'Create and schedule a post. Pass the body text, target account ids, and an ISO 8601 schedule_at. Omit schedule_at to save as draft. Use publish_now=true to publish immediately after creation.',
      inputSchema: z.object({
        workspace_id: z.string().uuid().describe('Workspace id (uuid)'),
        content: z.string().describe('Post body text'),
        account_ids: z
          .array(z.string().uuid())
          .min(1)
          .describe('Target social account ids (uuids)'),
        schedule_at: z.string().optional().describe('ISO 8601 timestamp; omit to save as draft'),
        publish_now: z.boolean().default(false),
        media_urls: z
          .array(z.string().url())
          .optional()
          .describe('Pre-uploaded media URLs from /api/v1/media/upload'),
        labels: z.array(z.string().uuid()).optional(),
      }),
      async execute(input) {
        const body = {
          workspace_id: input.workspace_id,
          status: input.publish_now ? 'publish' : input.schedule_at ? 'scheduled' : 'draft',
          content: [
            {
              text: input.content,
              media: (input.media_urls ?? []).map((url: string) => ({
                type: 'image',
                url,
                name: '',
              })),
              position: 0,
            },
          ],
          schedule_at: input.schedule_at,
          accounts: input.account_ids.map((id: string) => ({ id })),
          labels: input.labels,
        };
        const created = await client.post<{ id: string }>('/api/v1/posts', body);
        if (input.publish_now && created?.id) {
          return client.post(`/api/v1/posts/${created.id}/publish`);
        }
        return created;
      },
    },

    {
      name: 'edit_post',
      description: 'Update an existing post. Only provided fields are changed.',
      inputSchema: z.object({
        id: z.string().uuid().describe('Post id (uuid)'),
        content: z.string().optional(),
        schedule_at: z.string().optional(),
        labels: z.array(z.string().uuid()).optional(),
      }),
      async execute(input) {
        const body: Record<string, unknown> = {};
        if (input.content !== undefined) {
          body.content = [{ text: input.content, media: [], position: 0 }];
        }
        if (input.schedule_at !== undefined) body.schedule_at = input.schedule_at;
        if (input.labels !== undefined) body.labels = input.labels;
        return client.put(`/api/v1/posts/${input.id}`, body);
      },
    },

    {
      name: 'cancel_post',
      description:
        'Cancel a scheduled post. The post stays in the system but will not be published.',
      inputSchema: z.object({
        id: z.string().uuid().describe('Post id (uuid)'),
      }),
      async execute(input) {
        return client.post(`/api/v1/posts/${input.id}/cancel`);
      },
    },

    {
      name: 'delete_post',
      description: 'Permanently delete a post. Cannot be undone.',
      inputSchema: z.object({
        id: z.string().uuid().describe('Post id (uuid)'),
      }),
      async execute(input) {
        return client.delete(`/api/v1/posts/${input.id}`);
      },
    },

    {
      name: 'list_post_deliveries',
      description:
        'Show per-account delivery status (queued, publishing, published, failed) for a post.',
      inputSchema: z.object({
        id: z.string().uuid().describe('Post id (uuid)'),
      }),
      async execute(input) {
        return client.get(`/api/v1/posts/${input.id}/deliveries`);
      },
    },
  ];
}
