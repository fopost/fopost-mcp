import { z } from 'zod';
import type { FoPostClient } from '../client.js';
import type { ToolDefinition } from '../types.js';

export function activityTools(client: FoPostClient): ToolDefinition[] {
  return [
    {
      name: 'list_activity',
      description:
        'What happened in a workspace, newest first: posts published or failed, accounts connected or disconnected, webhook deliveries, inbox replies, automation runs, and usage invoices. Each event says who did it. Use for "what happened while I was away" and "who disconnected that account". For the security audit trail use kind "security", or the dedicated list_audit_events tool.',
      inputSchema: z.object({
        workspace_id: z
          .string()
          .uuid()
          .optional()
          .describe('Omit to read every workspace the key can reach'),
        kind: z
          .enum(['publish', 'connection', 'webhook', 'inbox', 'automation', 'billing', 'security'])
          .optional(),
        from: z.string().optional().describe('ISO 8601. Only events at or after this time'),
        to: z.string().optional().describe('ISO 8601. Only events at or before this time'),
        cursor: z.string().optional().describe('meta.next_cursor from the previous page'),
        limit: z.number().int().min(1).max(100).optional(),
      }),
      async execute(input) {
        return client.get('/v1/activity', {
          workspace_id: input.workspace_id,
          kind: input.kind,
          from: input.from,
          to: input.to,
          cursor: input.cursor,
          limit: input.limit,
        });
      },
    },

    {
      name: 'list_audit_events',
      description:
        'The security audit log: who joined the team, left it, or changed role or workspace access, plus changes to two-step verification, passkeys, single sign-on, and signed-in devices. Each row carries the actor and the time. Read-only — these rows are append-only and never expire. Use for "who removed that member" and "who changed the roles last week".',
      inputSchema: z.object({
        workspace_id: z
          .string()
          .uuid()
          .optional()
          .describe('Omit to read every workspace the key can reach'),
        from: z.string().optional().describe('ISO 8601. Only events at or after this time'),
        to: z.string().optional().describe('ISO 8601. Only events at or before this time'),
        cursor: z.string().optional().describe('meta.next_cursor from the previous page'),
        limit: z.number().int().min(1).max(100).optional(),
      }),
      async execute(input) {
        return client.get('/v1/activity', {
          workspace_id: input.workspace_id,
          kind: 'security',
          from: input.from,
          to: input.to,
          cursor: input.cursor,
          limit: input.limit,
        });
      },
    },
  ];
}
