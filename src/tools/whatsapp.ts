import { z } from 'zod';
import type { FoPostClient } from '../client.js';
import type { ToolDefinition } from '../types.js';

/**
 * WhatsApp Business tools.
 *
 * The platform owns templates, flows, the business profile and the commerce
 * settings, so every tool here is a live read or write against the customer's
 * own WhatsApp Business Account. Nothing is cached, and all of it answers 503
 * until WhatsApp is set up on the deployment.
 *
 * Reads and writes need the `accounts` scope; the sandbox sends a template and
 * needs `publish`.
 */
export function whatsappTools(client: FoPostClient): ToolDefinition[] {
  return [
    {
      name: 'get_whatsapp_profile',
      description:
        'The business profile on a WhatsApp number, plus how the platform rates it: quality rating, messaging limit tier, and the review state of the display name. Read live from the platform; answers 503 when WhatsApp is not set up.',
      inputSchema: z.object({
        account_id: z.string().uuid().describe('WhatsApp account id (uuid)'),
      }),
      async execute(input) {
        return client.get(`/v1/accounts/${input.account_id}/whatsapp/profile`);
      },
    },

    {
      name: 'update_whatsapp_profile',
      description:
        'Update the business profile fields the platform allows. The display name is not one of them: that is a review, requested separately, and the number keeps its old name until it passes.',
      inputSchema: z.object({
        account_id: z.string().uuid(),
        about: z.string().max(139).optional(),
        address: z.string().max(256).optional(),
        description: z.string().max(512).optional(),
        vertical: z.string().max(32).optional().describe('Business category, e.g. RETAIL'),
        websites: z.array(z.string().url()).max(2).optional(),
      }),
      async execute(input) {
        const { account_id: accountId, ...patch } = input;
        return client.request('PATCH', `/v1/accounts/${accountId}/whatsapp/profile`, patch);
      },
    },

    {
      name: 'list_whatsapp_templates',
      description:
        'Message templates on a WhatsApp Business Account, each with the review status the platform assigned. A template is how a conversation starts and how you reach someone after the 24 hour messaging window shuts.',
      inputSchema: z.object({
        account_id: z.string().uuid(),
        after: z.string().optional().describe('Pagination cursor from a previous page'),
      }),
      async execute(input) {
        return client.get(`/v1/accounts/${input.account_id}/whatsapp/templates`, {
          after: input.after,
        });
      },
    },

    {
      name: 'get_whatsapp_template_library',
      description:
        "The platform's own pre-written templates, for adapting instead of drafting one. Import one with create_whatsapp_template by naming its library entry.",
      inputSchema: z.object({
        account_id: z.string().uuid(),
        search: z.string().max(120).optional(),
      }),
      async execute(input) {
        return client.get(`/v1/accounts/${input.account_id}/whatsapp/templates/library`, {
          search: input.search,
        });
      },
    },

    {
      name: 'create_whatsapp_template',
      description:
        'File a WhatsApp message template for platform review, either from scratch or from a library entry. The result carries the status the platform assigned, which is PENDING on a normal submission: nothing marks a template approved but the platform.',
      inputSchema: z.object({
        account_id: z.string().uuid(),
        name: z
          .string()
          .regex(/^[a-z0-9_]+$/)
          .max(512)
          .describe('Lowercase letters, digits and underscores'),
        language: z.string().min(2).max(10).describe('Language code, e.g. en_US'),
        category: z.enum(['MARKETING', 'UTILITY', 'AUTHENTICATION']),
        body: z.string().max(1024).describe('The body text of the message'),
        footer: z.string().max(60).optional(),
        library_template_name: z
          .string()
          .max(512)
          .optional()
          .describe('Adapt this library entry instead of using body'),
      }),
      async execute(input) {
        const accountId = input.account_id;
        if (input.library_template_name) {
          return client.request('POST', `/v1/accounts/${accountId}/whatsapp/templates/import`, {
            library_template_name: input.library_template_name,
            name: input.name,
            language: input.language,
            category: input.category,
          });
        }
        return client.request('POST', `/v1/accounts/${accountId}/whatsapp/templates`, {
          name: input.name,
          language: input.language,
          category: input.category,
          components: [
            { type: 'BODY', text: input.body },
            ...(input.footer ? [{ type: 'FOOTER', text: input.footer }] : []),
          ],
          allow_category_change: true,
        });
      },
    },

    {
      name: 'list_whatsapp_flows',
      description:
        'In-chat forms on a WhatsApp Business Account, with their status and whatever the platform found wrong with each definition. A flow asks its questions as screens inside WhatsApp.',
      inputSchema: z.object({
        account_id: z.string().uuid(),
      }),
      async execute(input) {
        return client.get(`/v1/accounts/${input.account_id}/whatsapp/flows`);
      },
    },

    {
      name: 'get_whatsapp_flow_responses',
      description:
        "What people submitted through this account's WhatsApp flows, newest first. An answer rides on the message it arrived as.",
      inputSchema: z.object({
        account_id: z.string().uuid(),
      }),
      async execute(input) {
        return client.get(`/v1/accounts/${input.account_id}/whatsapp/flows/responses`);
      },
    },

    {
      name: 'list_whatsapp_groups',
      description:
        'Groups this WhatsApp number created, with their invite links. Participation is invite-only: no endpoint adds someone, so the link is how they join.',
      inputSchema: z.object({
        account_id: z.string().uuid(),
      }),
      async execute(input) {
        return client.get(`/v1/accounts/${input.account_id}/whatsapp/groups`);
      },
    },

    {
      name: 'get_whatsapp_account_state',
      description:
        "The WhatsApp Business Account's review and verification state, plus the number's quality rating, display name status and messaging limit tier. This is what the platform's account-level notifications report.",
      inputSchema: z.object({
        account_id: z.string().uuid(),
      }),
      async execute(input) {
        return client.get(`/v1/accounts/${input.account_id}/whatsapp/events`);
      },
    },
  ];
}
