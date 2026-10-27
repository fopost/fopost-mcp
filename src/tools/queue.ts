import { z } from 'zod';
import { seg, type FoPostClient } from '../client.js';
import type { ToolDefinition } from '../types.js';

const weekdaySchema = z.number().int().min(0).max(6).describe('0 = Sunday … 6 = Saturday');
const timeSchema = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/)
  .describe('HH:MM, 24-hour, in the slot timezone');
const timezoneSchema = z.string().min(1).max(100).describe('IANA zone name');

/**
 * The posting queue: recurring weekly slots a post lands in when it is
 * created with schedule "queue". Every tool here needs the `posts` scope.
 */
export function queueTools(client: FoPostClient): ToolDefinition[] {
  return [
    {
      name: 'list_queue_slots',
      description:
        'List the recurring weekly posting slots of a workspace, ordered by weekday and time. A slot with no account_id applies to every account.',
      inputSchema: z.object({
        workspace_id: z.string().uuid().describe('Workspace id (uuid)'),
      }),
      async execute(input) {
        return client.get('/v1/queue/slots', { workspace_id: input.workspace_id });
      },
    },

    {
      name: 'create_queue_slot',
      description:
        'Add a weekly posting slot. Omit account_id for a slot every account in the workspace shares.',
      inputSchema: z.object({
        workspace_id: z.string().uuid().describe('Workspace id (uuid)'),
        weekday: weekdaySchema,
        time: timeSchema,
        timezone: timezoneSchema,
        account_id: z
          .string()
          .uuid()
          .nullable()
          .optional()
          .describe('Limit the slot to one account; omit or null for every account'),
      }),
      async execute(input) {
        return client.post('/v1/queue/slots', {
          workspace_id: input.workspace_id,
          account_id: input.account_id,
          weekday: input.weekday,
          time: input.time,
          timezone: input.timezone,
        });
      },
    },

    {
      name: 'update_queue_slot',
      description:
        'Change a posting slot. Queued posts whose time no longer matches a free occurrence move to the next one and come back in moved. Only provided fields change.',
      inputSchema: z.object({
        id: z.string().uuid().describe('Slot id (uuid)'),
        weekday: weekdaySchema.optional(),
        time: timeSchema.optional(),
        timezone: timezoneSchema.optional(),
        account_id: z.string().uuid().nullable().optional(),
      }),
      async execute(input) {
        const body: Record<string, unknown> = {};
        if (input.account_id !== undefined) body.account_id = input.account_id;
        if (input.weekday !== undefined) body.weekday = input.weekday;
        if (input.time !== undefined) body.time = input.time;
        if (input.timezone !== undefined) body.timezone = input.timezone;
        return client.put(`/v1/queue/slots/${seg(input.id)}`, body);
      },
    },

    {
      name: 'delete_queue_slot',
      description:
        'Remove a posting slot. Queued posts that sat on it move to the next free occurrence and come back in moved.',
      inputSchema: z.object({
        id: z.string().uuid().describe('Slot id (uuid)'),
      }),
      async execute(input) {
        return client.delete(`/v1/queue/slots/${seg(input.id)}`);
      },
    },

    {
      name: 'get_queue_next',
      description:
        'The time a post added to the queue now would get. Pass account_id to ask for one account; without it the answer is the next free occurrence of any slot. null when no slot applies.',
      inputSchema: z.object({
        workspace_id: z.string().uuid().describe('Workspace id (uuid)'),
        account_id: z.string().uuid().optional(),
      }),
      async execute(input) {
        return client.get('/v1/queue/next', {
          workspace_id: input.workspace_id,
          account_id: input.account_id,
        });
      },
    },

    {
      name: 'preview_queue',
      description:
        'The next free slot occurrences in order, as a post-by-post preview of where queued posts would land.',
      inputSchema: z.object({
        workspace_id: z.string().uuid().describe('Workspace id (uuid)'),
        account_id: z.string().uuid().optional(),
        count: z.number().int().min(1).max(20).optional().describe('How many, default 5'),
      }),
      async execute(input) {
        return client.get('/v1/queue/preview', {
          workspace_id: input.workspace_id,
          account_id: input.account_id,
          count: input.count,
        });
      },
    },
  ];
}
