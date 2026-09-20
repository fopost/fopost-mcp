import { z } from 'zod';
import type { FoPostClient } from '../client.js';
import type { ToolDefinition } from '../types.js';

/**
 * Google Business Profile management for one connected location.
 *
 * Google grants Business Profile API access per project. Until that grant
 * lands on a deployment every tool here answers a 503 `configuration_error`,
 * which is worth saying in the description so the model reports it rather
 * than retrying.
 *
 * There is deliberately no tool for handing a location to another workspace.
 * This server exposes no move at all — `api-path.test.ts` pins that — so the
 * REST route stays the only way to relocate a connection.
 */
const PENDING_GRANT =
  'Answers 503 configuration_error until Google grants this FoPost deployment Business Profile API access.';

const DAILY_METRICS = [
  'BUSINESS_IMPRESSIONS_DESKTOP_MAPS',
  'BUSINESS_IMPRESSIONS_DESKTOP_SEARCH',
  'BUSINESS_IMPRESSIONS_MOBILE_MAPS',
  'BUSINESS_IMPRESSIONS_MOBILE_SEARCH',
  'BUSINESS_CONVERSATIONS',
  'BUSINESS_DIRECTION_REQUESTS',
  'CALL_CLICKS',
  'WEBSITE_CLICKS',
  'BUSINESS_BOOKINGS',
  'BUSINESS_FOOD_ORDERS',
  'BUSINESS_FOOD_MENU_CLICKS',
] as const;

const MEDIA_CATEGORIES = [
  'COVER',
  'PROFILE',
  'LOGO',
  'EXTERIOR',
  'INTERIOR',
  'PRODUCT',
  'AT_WORK',
  'FOOD_AND_DRINK',
  'MENU',
  'COMMON_AREA',
  'ROOMS',
  'TEAMS',
  'ADDITIONAL',
] as const;

const PLACE_ACTION_TYPES = [
  'APPOINTMENT',
  'ONLINE_APPOINTMENT',
  'DINING_RESERVATION',
  'FOOD_ORDERING',
  'FOOD_DELIVERY',
  'FOOD_TAKEOUT',
  'SHOP_ONLINE',
] as const;

const accountId = z.string().uuid().describe('Google Business account id (uuid)');

const gbp = (id: string, suffix: string) => `/v1/accounts/${id}/gbp${suffix}`;

export function googleBusinessTools(client: FoPostClient): ToolDefinition[] {
  return [
    {
      name: 'get_google_business_location',
      description: `Read a connected Google Business Profile location: name, description, website, phone, address, hours and categories. ${PENDING_GRANT}`,
      inputSchema: z.object({ account_id: accountId }),
      async execute(input) {
        return client.get(gbp(input.account_id, '/location'));
      },
    },

    {
      name: 'update_google_business_location',
      description: `Change a Business Profile location's public details. Only the fields you pass change; null clears one. ${PENDING_GRANT}`,
      inputSchema: z.object({
        account_id: accountId,
        title: z.string().min(1).max(255).optional().describe('Business name'),
        description: z.string().max(750).nullable().optional(),
        website_uri: z.string().url().nullable().optional(),
        primary_phone: z.string().max(30).nullable().optional(),
        store_code: z.string().max(64).nullable().optional(),
      }),
      async execute({ account_id, ...body }) {
        return client.request('PATCH', gbp(account_id, '/location'), body);
      },
    },

    {
      name: 'get_google_business_attributes',
      description: `Read the attributes set on a Business Profile location. Pass available=true to list the attributes Google offers for its category and region instead. ${PENDING_GRANT}`,
      inputSchema: z.object({
        account_id: accountId,
        available: z.boolean().optional(),
        category_name: z.string().optional(),
        region_code: z.string().optional(),
        language_code: z.string().optional(),
      }),
      async execute({ account_id, ...query }) {
        return client.get(gbp(account_id, '/attributes'), query);
      },
    },

    {
      name: 'update_google_business_attributes',
      description: `Set attributes on a Business Profile location. Only the named attributes change; every other one is left alone. ${PENDING_GRANT}`,
      inputSchema: z.object({
        account_id: accountId,
        attributes: z
          .array(
            z.object({
              name: z.string().describe('Google attribute id, e.g. attributes/has_wifi'),
              values: z.array(z.union([z.string(), z.boolean(), z.number()])).optional(),
              uri_values: z.array(z.string().url()).optional(),
            }),
          )
          .min(1)
          .max(100),
      }),
      async execute({ account_id, attributes }) {
        return client.request('PATCH', gbp(account_id, '/attributes'), { attributes });
      },
    },

    {
      name: 'get_google_business_menus',
      description: `Read a Business Profile location's food menus. ${PENDING_GRANT}`,
      inputSchema: z.object({ account_id: accountId }),
      async execute(input) {
        return client.get(gbp(input.account_id, '/menus'));
      },
    },

    {
      name: 'replace_google_business_menus',
      description: `Replace a Business Profile location's food menus. Google has no per-section patch, so send the whole set you want to end up with. ${PENDING_GRANT}`,
      inputSchema: z.object({
        account_id: accountId,
        menus: z
          .array(
            z.object({
              labels: z.array(z.object({ display_name: z.string() })).min(1),
              sections: z.array(
                z.object({
                  labels: z.array(z.object({ display_name: z.string() })).min(1),
                  items: z.array(
                    z.object({
                      labels: z
                        .array(
                          z.object({
                            display_name: z.string(),
                            description: z.string().optional(),
                          }),
                        )
                        .min(1),
                      price: z
                        .object({
                          currency_code: z.string().length(3),
                          units: z.string().optional(),
                        })
                        .optional(),
                    }),
                  ),
                }),
              ),
            }),
          )
          .max(10),
      }),
      async execute({ account_id, menus }) {
        return client.request('PUT', gbp(account_id, '/menus'), { menus });
      },
    },

    {
      name: 'get_google_business_services',
      description: `Read a Business Profile location's service list. ${PENDING_GRANT}`,
      inputSchema: z.object({ account_id: accountId }),
      async execute(input) {
        return client.get(gbp(input.account_id, '/services'));
      },
    },

    {
      name: 'replace_google_business_services',
      description: `Replace a Business Profile location's service list. Send the whole list you want to end up with. ${PENDING_GRANT}`,
      inputSchema: z.object({
        account_id: accountId,
        service_items: z
          .array(
            z.object({
              structured_service_item: z
                .object({
                  service_type_id: z.string(),
                  description: z.string().max(300).optional(),
                })
                .optional(),
              free_form_service_item: z
                .object({
                  category: z.string(),
                  label: z.object({
                    display_name: z.string(),
                    description: z.string().max(300).optional(),
                  }),
                })
                .optional(),
            }),
          )
          .max(100),
      }),
      async execute({ account_id, service_items }) {
        return client.request('PUT', gbp(account_id, '/services'), { service_items });
      },
    },

    {
      name: 'list_google_business_media',
      description: `List the photos on a Business Profile location. ${PENDING_GRANT}`,
      inputSchema: z.object({
        account_id: accountId,
        page_size: z.number().int().min(1).max(100).optional(),
        page_token: z.string().optional(),
      }),
      async execute({ account_id, ...query }) {
        return client.get(gbp(account_id, '/media'), query);
      },
    },

    {
      name: 'add_google_business_media',
      description: `Add a photo to a Business Profile location. The photo is a media-library asset in the same workspace, JPEG or PNG — use search_media to find its id. ${PENDING_GRANT}`,
      inputSchema: z.object({
        account_id: accountId,
        media_id: z.string().uuid().describe('Media library asset id (uuid)'),
        category: z.enum(MEDIA_CATEGORIES).optional(),
        description: z.string().max(500).optional(),
      }),
      async execute({ account_id, ...body }) {
        return client.post(gbp(account_id, '/media'), body);
      },
    },

    {
      name: 'delete_google_business_media',
      description: `Remove a photo from a Business Profile location, by the media key the listing returned. ${PENDING_GRANT}`,
      inputSchema: z.object({
        account_id: accountId,
        media_key: z.string().min(1).describe("Google's media key for the photo"),
      }),
      async execute(input) {
        return client.request(
          'DELETE',
          gbp(input.account_id, `/media/${encodeURIComponent(input.media_key)}`),
        );
      },
    },

    {
      name: 'list_google_business_place_actions',
      description: `List the Book, Order and Reserve buttons on a Business Profile listing. ${PENDING_GRANT}`,
      inputSchema: z.object({ account_id: accountId }),
      async execute(input) {
        return client.get(gbp(input.account_id, '/place-actions'));
      },
    },

    {
      name: 'create_google_business_place_action',
      description: `Add a Book, Order or Reserve button to a Business Profile listing. ${PENDING_GRANT}`,
      inputSchema: z.object({
        account_id: accountId,
        uri: z.string().url().describe('Where the button sends the visitor'),
        place_action_type: z.enum(PLACE_ACTION_TYPES),
        is_preferred: z.boolean().optional(),
      }),
      async execute({ account_id, ...body }) {
        return client.post(gbp(account_id, '/place-actions'), body);
      },
    },

    {
      name: 'update_google_business_place_action',
      description: `Change a Business Profile action link's URL or whether Google prefers it. ${PENDING_GRANT}`,
      inputSchema: z.object({
        account_id: accountId,
        link_id: z.string().min(1).describe("Google's place action link id"),
        uri: z.string().url().optional(),
        is_preferred: z.boolean().optional(),
      }),
      async execute({ account_id, link_id, ...body }) {
        return client.request(
          'PATCH',
          gbp(account_id, `/place-actions/${encodeURIComponent(link_id)}`),
          body,
        );
      },
    },

    {
      name: 'delete_google_business_place_action',
      description: `Remove a Book, Order or Reserve button from a Business Profile listing. ${PENDING_GRANT}`,
      inputSchema: z.object({
        account_id: accountId,
        link_id: z.string().min(1).describe("Google's place action link id"),
      }),
      async execute(input) {
        return client.request(
          'DELETE',
          gbp(input.account_id, `/place-actions/${encodeURIComponent(input.link_id)}`),
        );
      },
    },

    {
      name: 'get_google_business_verification',
      description: `List the ways Google will let a Business Profile location be verified, and whether it already is. ${PENDING_GRANT}`,
      inputSchema: z.object({
        account_id: accountId,
        language_code: z.string().optional(),
      }),
      async execute({ account_id, ...query }) {
        return client.get(gbp(account_id, '/verification'), query);
      },
    },

    {
      name: 'start_google_business_verification',
      description: `Start verifying a Business Profile location. The response names the pending verification to finish with complete_google_business_verification once the PIN arrives. ${PENDING_GRANT}`,
      inputSchema: z.object({
        account_id: accountId,
        method: z.enum(['ADDRESS', 'EMAIL', 'PHONE_CALL', 'SMS', 'AUTO', 'VETTED_PARTNER']),
        language_code: z.string().optional(),
        phone_number: z.string().max(30).optional(),
        email_address: z.string().email().optional(),
        mailer_contact_name: z.string().max(255).optional(),
      }),
      async execute({ account_id, ...body }) {
        return client.post(gbp(account_id, '/verification/start'), body);
      },
    },

    {
      name: 'complete_google_business_verification',
      description: `Finish a pending Business Profile verification with the PIN Google sent. ${PENDING_GRANT}`,
      inputSchema: z.object({
        account_id: accountId,
        verification_name: z.string().min(1).describe('From start_google_business_verification'),
        pin: z.string().min(1).max(20),
      }),
      async execute({ account_id, ...body }) {
        return client.post(gbp(account_id, '/verification/complete'), body);
      },
    },

    {
      name: 'get_google_business_performance',
      description: `Read how a Business Profile location performed: daily impressions on Search and Maps, calls, direction requests, website clicks, bookings and food orders. Pass keywords=true for the monthly search terms people used to find it instead. ${PENDING_GRANT}`,
      inputSchema: z.object({
        account_id: accountId,
        start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        daily_metrics: z.array(z.enum(DAILY_METRICS)).optional(),
        keywords: z.boolean().optional(),
        page_token: z.string().optional(),
      }),
      async execute({ account_id, ...query }) {
        return client.get(gbp(account_id, '/performance'), query);
      },
    },
  ];
}
