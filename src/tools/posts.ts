import { z } from 'zod';
import { seg, type FoPostClient } from '../client.js';
import type { ToolDefinition } from '../types.js';
import { MAX_FILES_PER_POST, sendPostWithFiles, type PostMediaItem } from '../files.js';

const filePathsSchema = z
  .array(z.string().min(1))
  .max(MAX_FILES_PER_POST)
  .optional()
  .describe(
    `Local file paths (up to ${MAX_FILES_PER_POST}) to upload and attach; large files take direct upload automatically`,
  );

type ExistingPost = {
  workspace_id: string | null;
  content?: Array<{ text?: string | null; media?: PostMediaItem[] | null; position?: number }>;
};

export function postsTools(client: FoPostClient): ToolDefinition[] {
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
        return client.get('/v1/posts', {
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
        return client.get(`/v1/posts/${seg(input.id)}`);
      },
    },

    {
      name: 'schedule_post',
      description:
        'Create and schedule a post. Pass the body text, target account ids or an account group, and an ISO 8601 schedule_at, or schedule="queue" for the next free posting slot. Omit both to save as draft. Use publish_now=true to publish immediately after creation.',
      inputSchema: z.object({
        workspace_id: z.string().uuid().describe('Workspace id (uuid)'),
        content: z.string().describe('Post body text'),
        account_ids: z
          .array(z.string().uuid())
          .min(1)
          .optional()
          .describe('Target social account ids (uuids); required unless account_group_id is set'),
        account_group_id: z
          .string()
          .uuid()
          .optional()
          .describe('Post to every account in this group, merged with account_ids'),
        schedule_at: z.string().optional().describe('ISO 8601 timestamp; omit to save as draft'),
        schedule: z
          .enum(['queue'])
          .optional()
          .describe(
            '"queue" drops the post into the next free posting slot instead of schedule_at',
          ),
        publish_now: z.boolean().default(false),
        media_urls: z
          .array(z.string().url())
          .optional()
          .describe('Pre-uploaded media URLs from /v1/media/upload'),
        labels: z.array(z.string().uuid()).optional(),
        file_paths: filePathsSchema,
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
          schedule: input.schedule,
          accounts: input.account_ids?.map((id: string) => ({ id })),
          account_group_id: input.account_group_id,
          labels: input.labels,
        };
        const created = input.file_paths?.length
          ? await sendPostWithFiles<{ id: string }>(
              client,
              'POST',
              '/v1/posts',
              body,
              input.file_paths,
              input.workspace_id,
            )
          : await client.post<{ id: string }>('/v1/posts', body);
        if (input.publish_now && created?.id) {
          return client.post(`/v1/posts/${seg(created.id)}/publish`);
        }
        return created;
      },
    },

    {
      name: 'edit_post',
      description:
        'Update an existing post. Only provided fields are changed. Pass schedule="queue" to move it onto the next free posting slot.',
      inputSchema: z.object({
        id: z.string().uuid().describe('Post id (uuid)'),
        content: z.string().optional(),
        schedule_at: z.string().optional(),
        schedule: z
          .enum(['queue'])
          .optional()
          .describe('"queue" moves the post into the next free posting slot'),
        labels: z.array(z.string().uuid()).optional(),
        file_paths: filePathsSchema,
      }),
      async execute(input) {
        const body: Record<string, unknown> = {};
        if (input.content !== undefined) {
          body.content = [{ text: input.content, media: [], position: 0 }];
        }
        if (input.schedule_at !== undefined) body.schedule_at = input.schedule_at;
        if (input.schedule !== undefined) body.schedule = input.schedule;
        if (input.labels !== undefined) body.labels = input.labels;
        if (!input.file_paths?.length) return client.put(`/v1/posts/${seg(input.id)}`, body);

        // Direct upload needs the workspace, and the existing blocks to append to.
        const existing = await client.get<ExistingPost>(`/v1/posts/${seg(input.id)}`);
        if (!existing.workspace_id) throw new Error('Post has no workspace');
        if (body.content === undefined && existing.content?.length) {
          body.content = existing.content.map((block, position) => ({
            text: block.text ?? null,
            media: (block.media ?? []).map(({ type, url, name }) => ({ type, url, name })),
            position: block.position ?? position,
          }));
        }
        return sendPostWithFiles(
          client,
          'PUT',
          `/v1/posts/${seg(input.id)}`,
          body,
          input.file_paths,
          existing.workspace_id,
        );
      },
    },

    {
      name: 'get_upload_limits',
      description:
        'Show the largest file this account may upload, how it is unlocked, and the allowed file types. Check before attaching a big video.',
      inputSchema: z.object({
        workspace_id: z.string().uuid().optional().describe('Workspace id (uuid)'),
      }),
      async execute(input) {
        return client.get('/v1/media/limits', { workspaceId: input.workspace_id });
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
        return client.post(`/v1/posts/${seg(input.id)}/cancel`);
      },
    },

    {
      name: 'unpublish_post',
      description:
        'Take a published post down on every network it is live on; the post stays as a record. Refused with 409 when one of those networks cannot delete a live post. Needs the publish scope.',
      inputSchema: z.object({
        id: z.string().uuid().describe('Post id (uuid)'),
      }),
      async execute(input) {
        return client.post(`/v1/posts/${seg(input.id)}/unpublish`);
      },
    },

    {
      name: 'delete_post',
      description: 'Permanently delete a post. Cannot be undone.',
      inputSchema: z.object({
        id: z.string().uuid().describe('Post id (uuid)'),
      }),
      async execute(input) {
        return client.delete(`/v1/posts/${seg(input.id)}`);
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
        return client.get(`/v1/posts/${seg(input.id)}/deliveries`);
      },
    },
  ];
}
