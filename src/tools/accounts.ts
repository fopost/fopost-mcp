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
