import { z } from 'zod';
import type { FoPostClient } from '../client.js';
import type { ToolDefinition } from '../types.js';

const INBOX_STATE = z.enum(['unread', 'read', 'resolved', 'snoozed']);
const INBOX_SORT = z.enum(['newest', 'oldest', 'unanswered']);

const threadFilters = {
  workspace_id: z.string().uuid().optional().describe('Restrict to one workspace'),
  platform: z.string().optional(),
  account_id: z.string().uuid().optional(),
  state: INBOX_STATE.optional(),
  q: z.string().optional().describe('Search text'),
  sort: INBOX_SORT.optional(),
  page: z.number().int().min(1).optional(),
  per_page: z.number().int().min(1).max(100).optional(),
};

export function inboxTools(client: FoPostClient): ToolDefinition[] {
  return [
    {
      name: 'list_inbox',
      description:
        'List inbox items (comments, mentions, DMs) newest first, with filters and pagination. Needs the inbox scope.',
      inputSchema: z.object({
        ...threadFilters,
        type: z.enum(['comment', 'mention', 'dm']).optional(),
        post_id: z.string().uuid().optional().describe('Comments under one FoPost post'),
        post_external_id: z
          .string()
          .optional()
          .describe(
            'Comments under one platform post, including posts not published through FoPost',
          ),
        conversation_id: z.string().optional().describe('One DM thread'),
        direction: z.enum(['inbound', 'outbound']).optional(),
      }),
      async execute(input) {
        return client.get('/v1/inbox', input);
      },
    },

    {
      name: 'list_inbox_threads',
      description:
        'List comment threads under your posts (kind=comments, default) or posts you were tagged in (kind=mentions). Needs the inbox scope.',
      inputSchema: z.object({
        ...threadFilters,
        kind: z.enum(['comments', 'mentions']).optional(),
      }),
      async execute(input) {
        return client.get('/v1/inbox/posts', input);
      },
    },

    {
      name: 'list_inbox_conversations',
      description: 'List DM conversations across connected accounts. Needs the inbox scope.',
      inputSchema: z.object(threadFilters),
      async execute(input) {
        return client.get('/v1/inbox/conversations', input);
      },
    },

    {
      name: 'get_inbox_unread_count',
      description: 'Count unread inbox items. Needs the inbox scope.',
      inputSchema: z.object({
        workspace_id: z.string().uuid().optional(),
      }),
      async execute(input) {
        return client.get('/v1/inbox/unread-count', input);
      },
    },

    {
      name: 'mark_inbox_thread_read',
      description:
        'Mark every item in a comment thread (post_external_id) or DM conversation (conversation_id) as read. Needs the inbox scope.',
      inputSchema: z.object({
        workspace_id: z.string().uuid(),
        account_id: z.string().uuid(),
        post_external_id: z.string().optional(),
        conversation_id: z.string().optional(),
      }),
      async execute(input) {
        return client.post('/v1/inbox/read', input);
      },
    },

    {
      name: 'reply_to_inbox_item',
      description:
        'Reply to a comment, mention or DM on the platform as the connected account. Needs the inbox scope.',
      inputSchema: z.object({
        id: z.string().uuid().describe('Inbox item id (uuid)'),
        text: z.string().min(1),
      }),
      async execute(input) {
        return client.post(`/v1/inbox/${input.id}/reply`, { text: input.text });
      },
    },

    {
      name: 'update_inbox_item',
      description:
        'Set an inbox item state (unread, read, resolved, snoozed). Snoozing needs snoozed_until. Needs the inbox scope.',
      inputSchema: z.object({
        id: z.string().uuid().describe('Inbox item id (uuid)'),
        state: INBOX_STATE,
        snoozed_until: z.string().optional().describe('ISO 8601, in the future'),
      }),
      async execute(input) {
        return client.request('PATCH', `/v1/inbox/${input.id}`, {
          state: input.state,
          snoozedUntil: input.snoozed_until,
        });
      },
    },

    {
      name: 'hide_inbox_item',
      description: 'Hide a comment on the platform. Needs the inbox scope.',
      inputSchema: z.object({
        id: z.string().uuid().describe('Inbox item id (uuid)'),
      }),
      async execute(input) {
        return client.post(`/v1/inbox/${input.id}/hide`);
      },
    },

    {
      name: 'unhide_inbox_item',
      description: 'Unhide a previously hidden comment on the platform. Needs the inbox scope.',
      inputSchema: z.object({
        id: z.string().uuid().describe('Inbox item id (uuid)'),
      }),
      async execute(input) {
        return client.post(`/v1/inbox/${input.id}/unhide`);
      },
    },

    {
      name: 'delete_inbox_item',
      description: 'Delete a comment on the platform. Cannot be undone. Needs the inbox scope.',
      inputSchema: z.object({
        id: z.string().uuid().describe('Inbox item id (uuid)'),
      }),
      async execute(input) {
        return client.delete(`/v1/inbox/${input.id}`);
      },
    },

    {
      name: 'list_inbox_approvals',
      description:
        'List drafted replies waiting for a person to approve before they are sent. Needs the inbox scope.',
      inputSchema: z.object({
        workspace_id: z.string().uuid().optional(),
      }),
      async execute(input) {
        return client.get('/v1/inbox/approvals', input);
      },
    },

    {
      name: 'approve_inbox_reply',
      description:
        'Approve a drafted reply and send it, optionally with edited text. Needs the inbox scope.',
      inputSchema: z.object({
        id: z.number().int().describe('Approval id (integer)'),
        text: z.string().optional().describe('Replace the drafted text before sending'),
      }),
      async execute(input) {
        return client.post(
          `/v1/inbox/approvals/${input.id}/approve`,
          input.text === undefined ? {} : { text: input.text },
        );
      },
    },

    {
      name: 'reject_inbox_reply',
      description: 'Reject a drafted reply so it is never sent. Needs the inbox scope.',
      inputSchema: z.object({
        id: z.number().int().describe('Approval id (integer)'),
      }),
      async execute(input) {
        return client.post(`/v1/inbox/approvals/${input.id}/reject`);
      },
    },

    {
      name: 'refresh_inbox',
      description:
        'Poll every inbox-capable account in a workspace now and report new items. Needs the inbox scope.',
      inputSchema: z.object({
        workspace_id: z.string().uuid(),
      }),
      async execute(input) {
        return client.post('/v1/inbox/refresh', input);
      },
    },
  ];
}
