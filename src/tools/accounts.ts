import { z } from 'zod';
import type { FoPostClient } from '../client.js';
import type { ToolDefinition } from '../types.js';

export function accountsTools(client: FoPostClient): ToolDefinition[] {
  return [
    {
      name: 'list_accounts',
      description:
        'List connected social accounts in a workspace. Returns platform, username, primary flag, and connection status. Pass group_id to list only the accounts in an account group.',
      inputSchema: z.object({
        workspace_id: z.string().uuid(),
        group_id: z.string().uuid().optional().describe('Only accounts in this account group'),
      }),
      async execute(input) {
        return client.get('/v1/accounts', {
          workspace_id: input.workspace_id,
          group_id: input.group_id,
        });
      },
    },

    {
      name: 'rename_account',
      description:
        'Set the display name FoPost shows for a connected account. Pass null or an empty string to restore the platform name.',
      inputSchema: z.object({
        account_id: z.string().uuid(),
        display_name: z.string().max(255).nullable(),
      }),
      async execute(input) {
        return client.request('PATCH', `/v1/accounts/${input.account_id}`, {
          display_name: input.display_name,
        });
      },
    },

    {
      name: 'list_account_groups',
      description:
        'List account groups (named sets of accounts to post to together) with their member account ids.',
      inputSchema: z.object({
        workspace_id: z.string().uuid().optional(),
      }),
      async execute(input) {
        return client.get('/v1/account-groups', { workspace_id: input.workspace_id });
      },
    },

    {
      name: 'get_account_group',
      description: 'Fetch one account group with its member account ids.',
      inputSchema: z.object({
        id: z.string().uuid().describe('Account group id (uuid)'),
      }),
      async execute(input) {
        return client.get(`/v1/account-groups/${input.id}`);
      },
    },

    {
      name: 'create_account_group',
      description: 'Create an account group in a workspace, optionally with its first members.',
      inputSchema: z.object({
        workspace_id: z.string().uuid(),
        name: z.string().min(1).max(100),
        account_ids: z.array(z.string().uuid()).max(200).optional(),
      }),
      async execute(input) {
        return client.post('/v1/account-groups', {
          workspace_id: input.workspace_id,
          name: input.name,
          account_ids: input.account_ids,
        });
      },
    },

    {
      name: 'rename_account_group',
      description: 'Rename an account group.',
      inputSchema: z.object({
        id: z.string().uuid().describe('Account group id (uuid)'),
        name: z.string().min(1).max(100),
      }),
      async execute(input) {
        return client.request('PATCH', `/v1/account-groups/${input.id}`, { name: input.name });
      },
    },

    {
      name: 'set_account_group_members',
      description:
        'Replace the accounts in an account group with exactly this list. Accounts left out are removed from the group.',
      inputSchema: z.object({
        id: z.string().uuid().describe('Account group id (uuid)'),
        account_ids: z.array(z.string().uuid()).max(200),
      }),
      async execute(input) {
        return client.put(`/v1/account-groups/${input.id}/members`, {
          account_ids: input.account_ids,
        });
      },
    },

    {
      name: 'delete_account_group',
      description: 'Delete an account group. Its accounts stay connected.',
      inputSchema: z.object({
        id: z.string().uuid().describe('Account group id (uuid)'),
      }),
      async execute(input) {
        return client.delete(`/v1/account-groups/${input.id}`);
      },
    },

    {
      name: 'create_telegram_connect_code',
      description:
        'Mint a one-time Telegram connect code (valid 15 minutes). Sending `/connect <code>` to the bot in a chat, group or channel connects that chat; the deep links carry the code.',
      inputSchema: z.object({
        workspace_id: z
          .string()
          .uuid()
          .optional()
          .describe('Optional for a key bound to one workspace'),
      }),
      async execute(input) {
        return client.post('/v1/accounts/telegram/connect-code', {
          workspaceId: input.workspace_id,
        });
      },
    },

    {
      name: 'get_telegram_connect_status',
      description:
        'Check a Telegram connect code: pending, connected (with account_id), failed (with reason) or expired.',
      inputSchema: z.object({
        code: z.string().min(1),
      }),
      async execute(input) {
        return client.get('/v1/accounts/telegram/connect-code/status', { code: input.code });
      },
    },

    {
      name: 'get_telegram_bot_commands',
      description: 'List the command menu the bot shows in a connected Telegram chat.',
      inputSchema: z.object({
        account_id: z.string().uuid(),
      }),
      async execute(input) {
        return client.get(`/v1/accounts/${input.account_id}/telegram/commands`);
      },
    },

    {
      name: 'set_telegram_bot_commands',
      description:
        'Replace the command menu the bot shows in a connected Telegram chat with exactly this list.',
      inputSchema: z.object({
        account_id: z.string().uuid(),
        commands: z
          .array(
            z.object({
              command: z
                .string()
                .regex(/^[a-z0-9_]{1,32}$/)
                .describe('1-32 lowercase letters, digits or underscores, no leading slash'),
              description: z.string().min(1).max(256),
            }),
          )
          .min(1)
          .max(100),
      }),
      async execute(input) {
        return client.put(`/v1/accounts/${input.account_id}/telegram/commands`, {
          commands: input.commands,
        });
      },
    },

    {
      name: 'clear_telegram_bot_commands',
      description: 'Remove every command from the bot menu in a connected Telegram chat.',
      inputSchema: z.object({
        account_id: z.string().uuid(),
      }),
      async execute(input) {
        return client.delete(`/v1/accounts/${input.account_id}/telegram/commands`);
      },
    },

    {
      name: 'list_slack_channels',
      description:
        'List the channels a connected Slack account can post to, and which one it posts to now.',
      inputSchema: z.object({
        account_id: z.string().uuid(),
      }),
      async execute(input) {
        return client.get(`/v1/accounts/${input.account_id}/slack/channels`);
      },
    },

    {
      name: 'list_slack_members',
      description:
        'List people in a connected Slack workspace; a member id is the handle for start_inbox_conversation.',
      inputSchema: z.object({
        account_id: z.string().uuid(),
      }),
      async execute(input) {
        return client.get(`/v1/accounts/${input.account_id}/slack/members`);
      },
    },

    {
      name: 'get_slack_identity',
      description: 'Show the name and icon a connected Slack account posts under.',
      inputSchema: z.object({
        account_id: z.string().uuid(),
      }),
      async execute(input) {
        return client.get(`/v1/accounts/${input.account_id}/slack/identity`);
      },
    },

    {
      name: 'set_slack_identity',
      description:
        'Set the name and icon a connected Slack account posts under. Omitted fields stay, null clears one; set icon_url or icon_emoji, not both.',
      inputSchema: z.object({
        account_id: z.string().uuid(),
        username: z.string().min(1).max(80).nullable().optional(),
        icon_url: z.string().url().max(2048).nullable().optional().describe('http(s) image URL'),
        icon_emoji: z
          .string()
          .regex(/^:[a-z0-9_+'-]+:$/)
          .nullable()
          .optional()
          .describe('Emoji code, e.g. :rocket:'),
      }),
      async execute({ account_id, ...body }) {
        return client.request('PATCH', `/v1/accounts/${account_id}/slack/identity`, body);
      },
    },

    {
      name: 'list_discord_channels',
      description:
        'List the text channels a connected Discord bot account can post to, and which one it posts to now. A webhook connection answers 409 webhook_connection.',
      inputSchema: z.object({
        account_id: z.string().uuid(),
      }),
      async execute(input) {
        return client.get(`/v1/accounts/${input.account_id}/discord/channels`);
      },
    },

    {
      name: 'switch_discord_channel',
      description:
        'Move a connected Discord account to another channel in the same server. The channel must be one list_discord_channels returned.',
      inputSchema: z.object({
        account_id: z.string().uuid(),
        channel_id: z.string().min(1).describe('Discord channel id'),
      }),
      async execute({ account_id, channel_id }) {
        return client.request('PATCH', `/v1/accounts/${account_id}/discord/channels/current`, {
          channel_id,
        });
      },
    },

    {
      name: 'get_discord_identity',
      description: 'Show the nickname and avatar the bot wears in a connected Discord server.',
      inputSchema: z.object({
        account_id: z.string().uuid(),
      }),
      async execute(input) {
        return client.get(`/v1/accounts/${input.account_id}/discord/identity`);
      },
    },

    {
      name: 'set_discord_identity',
      description:
        'Set the nickname and avatar the bot wears in a connected Discord server. Omitted fields stay, null clears one.',
      inputSchema: z.object({
        account_id: z.string().uuid(),
        username: z.string().min(1).max(32).nullable().optional(),
        avatar_url: z.string().url().max(2048).nullable().optional().describe('http(s) image URL'),
      }),
      async execute({ account_id, ...body }) {
        return client.request('PATCH', `/v1/accounts/${account_id}/discord/identity`, body);
      },
    },

    {
      name: 'list_discord_pins',
      description: "List the pinned messages in a connected Discord account's channel.",
      inputSchema: z.object({
        account_id: z.string().uuid(),
      }),
      async execute(input) {
        return client.get(`/v1/accounts/${input.account_id}/discord/messages/pinned`);
      },
    },

    {
      name: 'manage_discord_message',
      description:
        "Act on one message in a connected Discord account's channel: delete it, pin or unpin it, crosspost it from an announcement channel, or start a thread on it. A thread needs thread_name.",
      inputSchema: z.object({
        account_id: z.string().uuid(),
        message_id: z.string().min(1).describe('Discord message id'),
        action: z.enum(['delete', 'pin', 'unpin', 'crosspost', 'thread']),
        thread_name: z.string().min(1).max(100).optional().describe('Required for action=thread'),
        auto_archive_duration: z
          .union([z.literal(60), z.literal(1440), z.literal(4320), z.literal(10080)])
          .optional()
          .describe('Minutes of inactivity before a thread archives'),
      }),
      async execute({ account_id, message_id, action, thread_name, auto_archive_duration }) {
        const base = `/v1/accounts/${account_id}/discord/messages/${message_id}`;
        switch (action) {
          case 'delete':
            return client.delete(base);
          case 'pin':
            return client.post(`${base}/pin`);
          case 'unpin':
            return client.delete(`${base}/pin`);
          case 'crosspost':
            return client.post(`${base}/crosspost`);
          default:
            return client.post(`${base}/thread`, {
              name: thread_name,
              ...(auto_archive_duration ? { auto_archive_duration } : {}),
            });
        }
      },
    },

    {
      name: 'send_discord_dm',
      description:
        'Send one direct message to a member of a connected Discord server. The member id comes from list_discord_members.',
      inputSchema: z.object({
        account_id: z.string().uuid(),
        member_id: z.string().min(1).describe('Discord user id'),
        content: z.string().min(1).max(2000),
      }),
      async execute({ account_id, ...body }) {
        return client.post(`/v1/accounts/${account_id}/discord/dm`, body);
      },
    },

    {
      name: 'list_discord_events',
      description: "List the scheduled events on a connected Discord server's calendar.",
      inputSchema: z.object({
        account_id: z.string().uuid(),
      }),
      async execute(input) {
        return client.get(`/v1/accounts/${input.account_id}/discord/events`);
      },
    },

    {
      name: 'create_discord_event',
      description:
        'Add a scheduled event to a connected Discord server. Give channel_id for an event in a voice or stage channel, or location with an end_time for one somewhere else.',
      inputSchema: z.object({
        account_id: z.string().uuid(),
        name: z.string().min(1).max(100),
        description: z.string().max(1000).optional(),
        start_time: z.string().datetime(),
        end_time: z.string().datetime().optional(),
        channel_id: z.string().min(1).optional().describe('A voice or stage channel'),
        location: z.string().min(1).max(100).optional(),
      }),
      async execute({ account_id, ...body }) {
        return client.post(`/v1/accounts/${account_id}/discord/events`, body);
      },
    },

    {
      name: 'update_discord_event',
      description:
        'Change a Discord scheduled event. Omitted fields stay as they are; status is scheduled, active, completed or canceled.',
      inputSchema: z.object({
        account_id: z.string().uuid(),
        event_id: z.string().min(1).describe('Discord event id'),
        name: z.string().min(1).max(100).optional(),
        description: z.string().max(1000).optional(),
        start_time: z.string().datetime().optional(),
        end_time: z.string().datetime().optional(),
        channel_id: z.string().min(1).optional(),
        location: z.string().min(1).max(100).optional(),
        status: z.enum(['scheduled', 'active', 'completed', 'canceled']).optional(),
      }),
      async execute({ account_id, event_id, ...body }) {
        return client.request(
          'PATCH',
          `/v1/accounts/${account_id}/discord/events/${event_id}`,
          body,
        );
      },
    },

    {
      name: 'delete_discord_event',
      description: 'Remove a scheduled event from a connected Discord server.',
      inputSchema: z.object({
        account_id: z.string().uuid(),
        event_id: z.string().min(1).describe('Discord event id'),
      }),
      async execute({ account_id, event_id }) {
        return client.delete(`/v1/accounts/${account_id}/discord/events/${event_id}`);
      },
    },

    {
      name: 'list_discord_members',
      description:
        'List or search the members of a connected Discord server. A member id is what send_discord_dm and assign_discord_role take.',
      inputSchema: z.object({
        account_id: z.string().uuid(),
        query: z.string().min(1).optional().describe('Search by username or nickname prefix'),
        limit: z.number().int().min(1).max(1000).optional(),
      }),
      async execute({ account_id, query, limit }) {
        return client.get(`/v1/accounts/${account_id}/discord/members`, { q: query, limit });
      },
    },

    {
      name: 'list_discord_roles',
      description: 'List the roles on a connected Discord server, highest first.',
      inputSchema: z.object({
        account_id: z.string().uuid(),
      }),
      async execute(input) {
        return client.get(`/v1/accounts/${input.account_id}/discord/roles`);
      },
    },

    {
      name: 'create_discord_role',
      description: 'Add a role to a connected Discord server.',
      inputSchema: z.object({
        account_id: z.string().uuid(),
        name: z.string().min(1).max(100),
        color: z.number().int().min(0).max(0xffffff).optional().describe('RGB integer'),
        hoist: z.boolean().optional().describe('Show holders separately in the member list'),
        mentionable: z.boolean().optional(),
      }),
      async execute({ account_id, ...body }) {
        return client.post(`/v1/accounts/${account_id}/discord/roles`, body);
      },
    },

    {
      name: 'assign_discord_role',
      description:
        'Give a member of a connected Discord server a role, or take one away. Role and member ids come from list_discord_roles and list_discord_members.',
      inputSchema: z.object({
        account_id: z.string().uuid(),
        role_id: z.string().min(1).describe('Discord role id'),
        member_id: z.string().min(1).describe('Discord user id'),
        action: z.enum(['add', 'remove']).default('add'),
      }),
      async execute({ account_id, role_id, member_id, action }) {
        const path = `/v1/accounts/${account_id}/discord/roles/${role_id}/members/${member_id}`;
        return action === 'add' ? client.put(path) : client.delete(path);
      },
    },

    {
      name: 'get_account_health',
      description:
        'Check token freshness and rate-limit headroom for a single account. Useful when posts are failing — tells you if the OAuth token has expired.',
      inputSchema: z.object({
        account_id: z.string().uuid(),
      }),
      async execute(input) {
        return client.get(`/v1/accounts/${input.account_id}/health`);
      },
    },

    {
      name: 'list_workspaces',
      description: 'List workspaces the authenticated user has access to.',
      inputSchema: z.object({}),
      async execute() {
        return client.get('/v1/workspaces');
      },
    },
  ];
}
