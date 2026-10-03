import { z } from 'zod';
import type { FoPostClient } from '../client.js';
import type { ToolDefinition } from '../types.js';

/**
 * Contacts: the people behind the inbox. One row per human, however many
 * handles they write from. These need the inbox scope — a key that may read a
 * message may read who sent it — except the per-conversation analytics, which
 * is a count and reads under analytics like the rest of the numbers.
 */

const CONTACT_SOURCE = z.enum(['inbox', 'radar', 'import']);
const FIELD_TYPE = z.enum(['text', 'number', 'date', 'select', 'boolean']);

const channel = z.object({
  platform: z.string().describe('A platform slug, such as instagram'),
  handle: z.string().describe('Lower-cased, no leading @'),
  externalId: z
    .string()
    .nullable()
    .optional()
    .describe(
      "The platform's own id for that person, when known; a merge prefers it over a handle",
    ),
});

export function contactsTools(client: FoPostClient): ToolDefinition[] {
  return [
    {
      name: 'list_contacts',
      description:
        'List the people behind the inbox, most recently active first: every handle each one writes from, when they were first and last seen, and the custom fields the workspace keeps about them. Needs the inbox scope.',
      inputSchema: z.object({
        workspace_id: z.string().uuid().optional().describe('Restrict to one workspace'),
        search: z.string().optional().describe('Matches a display name or any of their handles'),
        platform: z.string().optional().describe('Only contacts with a handle on this network'),
        source: CONTACT_SOURCE.optional().describe('What first created the row'),
        page: z.number().int().min(1).optional(),
        per_page: z.number().int().min(1).max(100).optional(),
      }),
      async execute(input) {
        return client.get('/v1/contacts', input);
      },
    },

    {
      name: 'get_contact',
      description: 'Read one contact by id. Needs the inbox scope.',
      inputSchema: z.object({ id: z.string().uuid() }),
      async execute({ id }) {
        return client.get(`/v1/contacts/${id}`);
      },
    },

    {
      name: 'create_contact',
      description:
        'File a person by hand. Folds into the contact that already holds the first channel, so this cannot duplicate someone the inbox has already met. Needs the inbox scope.',
      inputSchema: z.object({
        workspace_id: z.string().uuid(),
        channels: z.array(channel).min(1).max(25),
        display_name: z.string().max(255).optional(),
        note: z.string().max(4000).optional(),
        fields: z.record(z.string()).optional().describe('Keyed by custom field key'),
      }),
      async execute(input) {
        return client.post('/v1/contacts', input);
      },
    },

    {
      name: 'update_contact',
      description:
        'Change a contact. Only what you send is written; a field set to null is cleared, and sending channels replaces the list. Needs the inbox scope.',
      inputSchema: z.object({
        id: z.string().uuid(),
        display_name: z.string().max(255).nullable().optional(),
        channels: z.array(channel).min(1).max(25).optional(),
        note: z.string().max(4000).nullable().optional(),
        fields: z.record(z.string().nullable()).optional(),
      }),
      async execute({ id, ...body }) {
        return client.request('PATCH', `/v1/contacts/${id}`, body);
      },
    },

    {
      name: 'delete_contact',
      description:
        'Remove a contact. The messages stay in the inbox, and a later one files the person again. Needs the inbox scope.',
      inputSchema: z.object({ id: z.string().uuid() }),
      async execute({ id }) {
        return client.delete(`/v1/contacts/${id}`);
      },
    },

    {
      name: 'list_contact_conversations',
      description:
        'The inbox threads one contact appears in, newest first, with how much each carried. Needs the inbox scope.',
      inputSchema: z.object({
        id: z.string().uuid(),
        limit: z.number().int().min(1).max(100).optional(),
      }),
      async execute({ id, ...params }) {
        return client.get(`/v1/contacts/${id}/conversations`, params);
      },
    },

    {
      name: 'import_contacts',
      description:
        'Import contacts from CSV text. platform and handle are required columns; external_id, display_name and note are optional, and every other column is read as a custom field key. A column matching no field is reported back rather than stored. Needs the inbox scope.',
      inputSchema: z.object({
        workspace_id: z.string().uuid(),
        csv: z.string().describe('The file contents, with a header row'),
      }),
      async execute(input) {
        return client.post('/v1/contacts/import', input);
      },
    },

    {
      name: 'list_contact_fields',
      description:
        'The columns this workspace keeps about its contacts, in display order. Needs the inbox scope.',
      inputSchema: z.object({ workspace_id: z.string().uuid() }),
      async execute(input) {
        return client.get('/v1/contacts/fields', input);
      },
    },

    {
      name: 'create_contact_field',
      description:
        'Add a column. The key is the machine name and also the CSV column header, and it is fixed once created. A select field needs at least one option. Needs the inbox scope.',
      inputSchema: z.object({
        workspace_id: z.string().uuid(),
        key: z
          .string()
          .regex(
            /^[a-z][a-z0-9_]*$/,
            'Lower-case letters, digits and underscores, starting with a letter',
          ),
        name: z.string().max(120),
        type: FIELD_TYPE.optional(),
        options: z.array(z.string()).max(50).optional().describe('Required when type is select'),
      }),
      async execute({ workspace_id, ...body }) {
        return client.request(
          'POST',
          '/v1/contacts/fields',
          { workspace_id, ...body },
          {
            workspace_id,
          },
        );
      },
    },

    {
      name: 'update_contact_field',
      description:
        'Rename a field, change its options, or move it. The key and the type are fixed. Needs the inbox scope.',
      inputSchema: z.object({
        id: z.string().uuid(),
        name: z.string().max(120).optional(),
        options: z.array(z.string()).max(50).optional(),
        position: z.number().int().min(0).max(1000).optional(),
      }),
      async execute({ id, ...body }) {
        return client.request('PATCH', `/v1/contacts/fields/${id}`, body);
      },
    },

    {
      name: 'delete_contact_field',
      description: 'Remove a field and every contact answer to it. Needs the inbox scope.',
      inputSchema: z.object({ id: z.string().uuid() }),
      async execute({ id }) {
        return client.delete(`/v1/contacts/fields/${id}`);
      },
    },

    {
      name: 'get_conversation_analytics',
      description:
        'Inbox analytics broken out per thread: what each one carried and how long it waited for a reply. The key on each row is an opaque handle for the thread, stable across calls, not the id or handle the inbox groups on. Needs the analytics scope.',
      inputSchema: z.object({
        workspace_id: z.string().uuid().optional(),
        accountId: z.string().uuid().optional().describe('Narrow to one connected account'),
        days: z.number().int().min(1).max(365).optional().describe('Reporting period, default 7'),
        sort: z.enum(['volume', 'slowest', 'recent']).optional(),
        page: z.number().int().min(1).optional(),
        per_page: z.number().int().min(1).max(100).optional(),
      }),
      async execute(input) {
        return client.get('/v1/analytics/inbox/conversations', input);
      },
    },
  ];
}
