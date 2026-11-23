import { z } from 'zod';
import type { FoPostClient } from '../client.js';
import type { ToolDefinition } from '../types.js';

/**
 * Google Ads only. Audiences and insights are on the shared ads tools and
 * dispatch by connection; what is here (Local Services leads, conversion
 * actions and raw GAQL) has no equivalent on another network, and a
 * connection on one answers 400.
 */

const customerId = z
  .string()
  .regex(/^\d{8,12}$/)
  .describe('Google Ads customer id, digits only. Must be an account the connection reaches.');

const readScope = {
  workspace_id: z.string().uuid().optional().describe('Restrict to one workspace'),
  connection_id: z.string().uuid().describe('A Google Ads connection'),
  customer_id: customerId,
};

const dateRange = {
  since: z.string().describe('YYYY-MM-DD, inclusive'),
  until: z.string().describe('YYYY-MM-DD, inclusive'),
};

type ReadScope = { workspace_id?: string; connection_id: string; customer_id: string };

const query = (input: ReadScope, extra: Record<string, string | undefined> = {}) => ({
  workspace_id: input.workspace_id,
  connection_id: input.connection_id,
  customer_id: input.customer_id,
  ...extra,
});

export function googleAdsTools(client: FoPostClient): ToolDefinition[] {
  return [
    {
      name: 'list_google_local_services_leads',
      description:
        'Read leads from Google Local Services Ads over a date range. Read live, never stored. Needs the ads scope.',
      inputSchema: z.object({ ...readScope, ...dateRange }),
      async execute(input) {
        return client.get(
          '/v1/ads/google/local-services',
          query(input, { since: input.since, until: input.until }),
        );
      },
    },

    {
      name: 'list_google_conversion_actions',
      description: 'List a Google Ads account’s conversion actions. Needs the ads scope.',
      inputSchema: z.object(readScope),
      async execute(input) {
        return client.get('/v1/ads/google/conversions', query(input));
      },
    },

    {
      name: 'run_google_ads_query',
      description:
        'Run a read-only Google Ads Query Language SELECT against one account, for anything the shaped tools do not cover. The account read is customer_id, never anything named inside the query. Google Ads only. Needs the ads scope.',
      inputSchema: z.object({
        ...readScope,
        query: z.string().min(10).max(5000).describe('A GAQL SELECT'),
      }),
      async execute(input) {
        return client.post('/v1/ads/insights/query', {
          workspaceId: input.workspace_id,
          connectionId: input.connection_id,
          customerId: input.customer_id,
          query: input.query,
        });
      },
    },
  ];
}
