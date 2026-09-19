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
