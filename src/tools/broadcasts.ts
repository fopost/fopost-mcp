import { z } from 'zod';
import type { FoPostClient } from '../client.js';
import type { ToolDefinition } from '../types.js';

/**
 * Broadcasts and drip sequences: one message into many conversations, and a
 * series of messages on a delay.
 *
 * Neither opens a cold DM — every message lands in a direct-message thread the
 * contact already started. Nothing is sent into a closed messaging window:
 * Messenger and Instagram take a business-initiated message only within 24
 * hours of the contact's last one, so recipients outside it come back skipped
 * with window_closed and nothing is attempted. Telegram, Slack, Bluesky and
 * Reddit have no window.
 *
 * Reading needs the inbox scope; sending, cancelling, enrolling and
 * unenrolling also need publish.
 */

const BROADCAST_STATUS = z.enum(['draft', 'scheduled', 'sending', 'sent', 'cancelled']);
const RECIPIENT_STATUS = z.enum(['pending', 'sent', 'skipped', 'failed']);
const SEQUENCE_STATUS = z.enum(['active', 'paused']);

const audience = z
  .object({
    platforms: z
      .array(z.string())
      .max(20)
      .optional()
      .describe('Contacts with a handle on at least one of these networks'),
    label_ids: z.array(z.string().uuid()).max(20).optional(),
    source: z.enum(['inbox', 'radar', 'import']).optional(),
    fields: z
      .array(
        z.object({
          key: z.string().describe("The custom field's machine key"),
          op: z.enum(['is', 'is_not', 'contains', 'is_set', 'is_not_set']).optional(),
          value: z.string().optional(),
        }),
      )
      .max(20)
      .optional(),
  })
  .describe(
    'Who it goes to, over contacts. Every clause narrows: a contact has to match all of them. Omit it to reach every contact in the workspace.',
  );

const step = z.object({
  delay_hours: z
    .number()
    .min(0)
    .describe('Hours to wait after the previous step; 0 on the first means straight away'),
  text: z.string().min(1).max(4000),
  media_id: z.string().uuid().nullable().optional(),
});

export function broadcastsTools(client: FoPostClient): ToolDefinition[] {
  return [
    {
      name: 'list_broadcasts',
      description:
        'List broadcasts, newest first: one message written once and sent into every conversation its audience matches, with its status and what became of its recipients. Needs the inbox scope.',
      inputSchema: z.object({
        workspace_id: z.string().uuid().optional().describe('Restrict to one workspace'),
        status: BROADCAST_STATUS.optional(),
        page: z.number().int().min(1).optional(),
        per_page: z.number().int().min(1).max(100).optional(),
      }),
      async execute(input) {
        return client.get('/v1/broadcasts', input);
      },
    },

    {
      name: 'get_broadcast',
      description: 'Read one broadcast by id. Needs the inbox scope.',
      inputSchema: z.object({ id: z.string().uuid() }),
      async execute({ id }) {
        return client.get(`/v1/broadcasts/${id}`);
      },
    },

    {
      name: 'create_broadcast',
      description:
        'Write a broadcast without sending it. Give scheduled_at to have it go out on its own at that time, or call send_broadcast when ready. Needs the inbox scope.',
      inputSchema: z.object({
        workspace_id: z.string().uuid(),
        account_id: z.string().uuid().describe('The connected account the messages go out from'),
        name: z.string().min(1).max(120).describe('Internal only; never sent to anyone'),
        text: z.string().min(1).max(4000),
        media_id: z.string().uuid().nullable().optional(),
        audience: audience.optional(),
        scheduled_at: z.string().datetime().nullable().optional(),
      }),
      async execute(input) {
        return client.post('/v1/broadcasts', input);
      },
    },

    {
      name: 'update_broadcast',
      description:
        'Change a broadcast. Only a draft or scheduled broadcast can be edited; once it is sending the text is fixed. Needs the inbox scope.',
      inputSchema: z.object({
        id: z.string().uuid(),
        name: z.string().min(1).max(120).optional(),
        text: z.string().min(1).max(4000).optional(),
        media_id: z.string().uuid().nullable().optional(),
        audience: audience.optional(),
        scheduled_at: z.string().datetime().nullable().optional(),
      }),
      async execute({ id, ...body }) {
        return client.request('PATCH', `/v1/broadcasts/${id}`, body);
      },
    },

    {
      name: 'send_broadcast',
      description:
        "Send a broadcast into every conversation its audience matches. The messages go out and cannot be recalled. Contacts a network's messaging window has closed on are skipped with window_closed rather than attempted, so the number sent is often lower than the audience — read list_broadcast_recipients with status=skipped to see who and why. Needs the inbox and publish scopes.",
      inputSchema: z.object({ id: z.string().uuid() }),
      async execute({ id }) {
        return client.post(`/v1/broadcasts/${id}/send`, {});
      },
    },

    {
      name: 'cancel_broadcast',
      description:
        'Stop a broadcast where it stands. Anyone not yet written to stays unsent; messages already delivered are not recalled. Needs the inbox and publish scopes.',
      inputSchema: z.object({ id: z.string().uuid() }),
      async execute({ id }) {
        return client.post(`/v1/broadcasts/${id}/cancel`, {});
      },
    },

    {
      name: 'list_broadcast_recipients',
      description:
        "One row per contact on a broadcast, with what became of their message. A skipped row carries its reason: window_closed means the network's messaging window had shut and nothing was attempted. Needs the inbox scope.",
      inputSchema: z.object({
        id: z.string().uuid(),
        status: RECIPIENT_STATUS.optional(),
        page: z.number().int().min(1).optional(),
        per_page: z.number().int().min(1).max(200).optional(),
      }),
      async execute({ id, ...query }) {
        return client.get(`/v1/broadcasts/${id}/recipients`, query);
      },
    },

    {
      name: 'delete_broadcast',
      description:
        'Delete a broadcast and its recipient records. Messages already sent stay in the conversations they went to. This cannot be undone. Needs the inbox scope.',
      inputSchema: z.object({ id: z.string().uuid() }),
      async execute({ id }) {
        return client.delete(`/v1/broadcasts/${id}`);
      },
    },

    {
      name: 'list_sequences',
      description:
        'List drip sequences: a series of messages, each a delay after the one before, walked per enrolled contact. Needs the inbox scope.',
      inputSchema: z.object({
        workspace_id: z.string().uuid().optional().describe('Restrict to one workspace'),
        page: z.number().int().min(1).optional(),
        per_page: z.number().int().min(1).max(100).optional(),
      }),
      async execute(input) {
        return client.get('/v1/sequences', input);
      },
    },

    {
      name: 'get_sequence',
      description: 'Read one sequence and the steps it walks. Needs the inbox scope.',
      inputSchema: z.object({ id: z.string().uuid() }),
      async execute({ id }) {
        return client.get(`/v1/sequences/${id}`);
      },
    },

    {
      name: 'create_sequence',
      description:
        'Write a drip sequence. Creating one enrolls nobody. The messaging window applies to every step: one that comes due outside it is skipped rather than sent, and the enrollment carries on. Needs the inbox scope.',
      inputSchema: z.object({
        workspace_id: z.string().uuid(),
        account_id: z.string().uuid().describe('The connected account every step is sent from'),
        name: z.string().min(1).max(120).describe('Internal only; never sent to anyone'),
        steps: z.array(step).min(1).max(20),
        status: SEQUENCE_STATUS.optional(),
      }),
      async execute(input) {
        return client.post('/v1/sequences', input);
      },
    },

    {
      name: 'update_sequence',
      description:
        'Change a sequence. Pausing stops every enrollment from firing without ending any of them; resuming picks them up where they stood. Needs the inbox scope.',
      inputSchema: z.object({
        id: z.string().uuid(),
        name: z.string().min(1).max(120).optional(),
        steps: z.array(step).min(1).max(20).optional(),
        status: SEQUENCE_STATUS.optional(),
      }),
      async execute({ id, ...body }) {
        return client.request('PATCH', `/v1/sequences/${id}`, body);
      },
    },

    {
      name: 'enroll_in_sequence',
      description:
        'Put contacts on a sequence, by id or by the same audience filter a broadcast takes. Re-enrolling someone restarts their walk from the first step rather than running two in parallel. Needs the inbox and publish scopes.',
      inputSchema: z.object({
        id: z.string().uuid(),
        contact_ids: z.array(z.string().uuid()).max(5000).optional(),
        audience: audience.optional(),
      }),
      async execute({ id, ...body }) {
        return client.post(`/v1/sequences/${id}/enroll`, body);
      },
    },

    {
      name: 'unenroll_from_sequence',
      description:
        'Take contacts off a sequence. Nothing further fires for them — this is what to call when someone asks to stop hearing from you. Needs the inbox and publish scopes.',
      inputSchema: z.object({
        id: z.string().uuid(),
        contact_ids: z.array(z.string().uuid()).min(1).max(5000),
      }),
      async execute({ id, contact_ids }) {
        return client.post(`/v1/sequences/${id}/unenroll`, { contact_ids });
      },
    },

    {
      name: 'list_sequence_enrollments',
      description:
        'Who is on a sequence, what step they are at, and when the next one is due. A skipped step leaves its reason on the enrollment. Needs the inbox scope.',
      inputSchema: z.object({
        id: z.string().uuid(),
        page: z.number().int().min(1).optional(),
        per_page: z.number().int().min(1).max(200).optional(),
      }),
      async execute({ id, ...query }) {
        return client.get(`/v1/sequences/${id}/enrollments`, query);
      },
    },

    {
      name: 'delete_sequence',
      description:
        'Delete a sequence and every enrollment on it. Messages already sent stay in the conversations they went to. This cannot be undone. Needs the inbox scope.',
      inputSchema: z.object({ id: z.string().uuid() }),
      async execute({ id }) {
        return client.delete(`/v1/sequences/${id}`);
      },
    },
  ];
}
