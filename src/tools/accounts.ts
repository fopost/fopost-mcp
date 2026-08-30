import { z } from 'zod';
import type { FoPostClient } from '../client.js';
import type { ToolDefinition } from '../types.js';

export function accountsTools(client: FoPostClient): ToolDefinition[] {
  return [
    {
      name: 'list_accounts',
      description:
        'List connected social accounts in a workspace. Returns platform, username, primary flag, and connection status.',
      inputSchema: z.object({
        workspace_id: z.string().uuid(),
      }),
      async execute(input) {
        return client.get('/v1/accounts', { workspace_id: input.workspace_id });
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
