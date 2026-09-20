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
        'Reply to a comment, mention or DM on the platform as the connected account. A DM reply may attach media_ids and quick_replies, which also need the publish scope. Needs the inbox scope.',
      inputSchema: z.object({
        id: z.string().uuid().describe('Inbox item id (uuid)'),
        text: z.string().min(1).optional().describe('Required unless media_ids is given'),
        media_ids: z
          .array(z.string())
          .max(10)
          .optional()
          .describe('Media library ids to attach to a DM, where canSendMedia is true'),
        quick_replies: z
          .array(z.string().max(20))
          .max(13)
          .optional()
          .describe('Answer buttons under a DM, where canQuickReply is true'),
      }),
      async execute(input) {
        return client.post(`/v1/inbox/${input.id}/reply`, {
          text: input.text,
          media_ids: input.media_ids,
          quick_replies: input.quick_replies,
        });
      },
    },

    {
      name: 'edit_inbox_comment',
      description:
        'Edit the text of your own comment on the platform, where canEdit is true. Needs the inbox and publish scopes.',
      inputSchema: z.object({
        id: z.string().uuid().describe('Inbox item id (uuid)'),
        text: z.string().min(1),
      }),
      async execute(input) {
        return client.request('PATCH', `/v1/inbox/${input.id}`, { text: input.text });
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
      description:
        'Delete a comment, or your own reply, on the platform. Cannot be undone. Needs the inbox scope; your own reply also needs publish.',
      inputSchema: z.object({
        id: z.string().uuid().describe('Inbox item id (uuid)'),
      }),
      async execute(input) {
        return client.delete(`/v1/inbox/${input.id}`);
      },
    },

    {
      name: 'like_inbox_item',
      description:
        'Like a comment or message on the platform (an upvote on Reddit, a favourite on Mastodon), where canLike is true. Needs the inbox and publish scopes.',
      inputSchema: z.object({
        id: z.string().uuid().describe('Inbox item id (uuid)'),
      }),
      async execute(input) {
        return client.post(`/v1/inbox/${input.id}/like`);
      },
    },

    {
      name: 'unlike_inbox_item',
      description:
        'Remove your like from a comment or message on the platform. Needs the inbox and publish scopes.',
      inputSchema: z.object({
        id: z.string().uuid().describe('Inbox item id (uuid)'),
      }),
      async execute(input) {
        return client.post(`/v1/inbox/${input.id}/unlike`);
      },
    },

    {
      name: 'pin_inbox_item',
      description:
        'Pin your own comment on the platform, where canPin is true. Needs the inbox and publish scopes.',
      inputSchema: z.object({
        id: z.string().uuid().describe('Inbox item id (uuid)'),
      }),
      async execute(input) {
        return client.post(`/v1/inbox/${input.id}/pin`);
      },
    },

    {
      name: 'unpin_inbox_item',
      description: 'Unpin your own comment on the platform. Needs the inbox and publish scopes.',
      inputSchema: z.object({
        id: z.string().uuid().describe('Inbox item id (uuid)'),
      }),
      async execute(input) {
        return client.post(`/v1/inbox/${input.id}/unpin`);
      },
    },

    {
      name: 'react_to_inbox_item',
      description:
        'React to a DM with an emoji, or pass null to remove your reaction, where canReact is true. Needs the inbox and publish scopes.',
      inputSchema: z.object({
        id: z.string().uuid().describe('Inbox item id (uuid)'),
        reaction: z.string().max(32).nullable().describe('An emoji, or null to remove yours'),
      }),
      async execute(input) {
        return client.post(`/v1/inbox/${input.id}/react`, { reaction: input.reaction });
      },
    },

    {
      name: 'start_inbox_conversation',
      description:
        'Send a new DM: to a handle from account_id, or as a private reply to an inbox comment by comment_id. Needs the inbox and publish scopes.',
      inputSchema: z.object({
        account_id: z.string().uuid().optional().describe('The account to send from, with handle'),
        handle: z.string().optional().describe('Who to message'),
        comment_id: z
          .string()
          .uuid()
          .optional()
          .describe('An inbox comment to answer privately, where canPrivateReply is true'),
        text: z.string().min(1),
        media_ids: z.array(z.string()).max(10).optional().describe('Media library ids to attach'),
      }),
      async execute(input) {
        return client.post('/v1/inbox/conversations', input);
      },
    },

    {
      name: 'set_inbox_typing',
      description:
        'Show or clear the typing indicator in a DM conversation. Needs the inbox and publish scopes.',
      inputSchema: z.object({
        conversation_id: z.string().describe('DM conversation id'),
        account_id: z.string().uuid().describe('The account the conversation belongs to'),
        on: z.boolean().optional().describe('Default true; false clears the indicator'),
      }),
      async execute(input) {
        return client.post(`/v1/inbox/conversations/${input.conversation_id}/typing`, {
          account_id: input.account_id,
          on: input.on,
        });
      },
    },

    {
      name: 'handover_conversation',
      description:
        'Pass a Messenger conversation to another Meta app, or take it back when no app_id is given. The other app has to be subscribed to the same Page. Needs the inbox and publish scopes.',
      inputSchema: z.object({
        conversation_id: z.string().describe('DM conversation id'),
        account_id: z.string().uuid().describe('The account the conversation belongs to'),
        app_id: z
          .string()
          .regex(/^\d{1,32}$/)
          .optional()
          .describe('The Meta app to pass control to; omit to take control back'),
        metadata: z.string().max(1000).optional(),
      }),
      async execute(input) {
        return client.post(`/v1/inbox/conversations/${input.conversation_id}/handover`, {
          account_id: input.account_id,
          app_id: input.app_id,
          metadata: input.metadata,
        });
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
