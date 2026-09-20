import { z } from 'zod';
import type { FoPostClient } from '../client.js';
import type { ToolDefinition } from '../types.js';

/**
 * Google Ads only. Campaigns, ad groups, ads, audiences and insights are on the
 * shared ads tools and dispatch by connection; what is here — keywords, assets,
 * Performance Max asset groups, Local Services leads, conversions and raw GAQL —
 * has no equivalent on another network, and a connection on one answers 400.
 */

const OBJECT_ID = /^\d{8,12}~[a-zA-Z]+~\d{1,20}(~\d{1,20})?$/;

const objectId = z
  .string()
  .regex(OBJECT_ID)
  .describe('`<customerId>~<kind>~<id>`, e.g. `1234567890~adGroup~77`');

const customerId = z
  .string()
  .regex(/^\d{8,12}$/)
  .describe('Google Ads customer id, digits only. Must be an account the connection reaches.');

const readScope = {
  workspace_id: z.string().uuid().optional().describe('Restrict to one workspace'),
  connection_id: z.string().uuid().describe('A Google Ads connection'),
  customer_id: customerId,
};

const writeScope = {
  workspace_id: z.string().uuid(),
  connection_id: z.string().uuid().describe('A Google Ads connection'),
  customer_id: customerId,
};

const dateRange = {
  since: z.string().describe('YYYY-MM-DD, inclusive'),
  until: z.string().describe('YYYY-MM-DD, inclusive'),
};

type ReadScope = { workspace_id?: string; connection_id: string; customer_id: string };
type WriteScope = { workspace_id: string; connection_id: string; customer_id: string };

const query = (input: ReadScope, extra: Record<string, string | undefined> = {}) => ({
  workspace_id: input.workspace_id,
  connection_id: input.connection_id,
  customer_id: input.customer_id,
  ...extra,
});

const body = (input: WriteScope) => ({
  workspaceId: input.workspace_id,
  connectionId: input.connection_id,
  customerId: input.customer_id,
});

export function googleAdsTools(client: FoPostClient): ToolDefinition[] {
  return [
    {
      name: 'list_google_keywords',
      description:
        'List the keywords on a Google Ads account, or on one ad group. Google Ads only. Needs the ads scope.',
      inputSchema: z.object({
        ...readScope,
        ad_group_id: objectId.optional().describe('Limit to one ad group'),
      }),
      async execute(input) {
        return client.get(
          '/v1/ads/google/keywords',
          query(input, { ad_group_id: input.ad_group_id }),
        );
      },
    },

    {
      name: 'create_google_keyword',
      description:
        'Add a keyword to a Google Ads ad group. The keyword goes live, so this needs the ads and publish scopes.',
      inputSchema: z.object({
        ...writeScope,
        ad_group_id: objectId,
        text: z.string().min(1).max(80),
        match_type: z.enum(['EXACT', 'PHRASE', 'BROAD']),
        cpc_bid_minor: z
          .number()
          .int()
          .positive()
          .optional()
          .describe('Bid in the account currency, minor units'),
      }),
      async execute(input) {
        return client.post('/v1/ads/google/keywords', {
          ...body(input),
          adGroupId: input.ad_group_id,
          text: input.text,
          matchType: input.match_type,
          cpcBidMinor: input.cpc_bid_minor,
        });
      },
    },

    {
      name: 'set_google_keyword_status',
      description: 'Pause, resume or rebid a Google Ads keyword. Needs the ads and publish scopes.',
      inputSchema: z.object({
        ...writeScope,
        keyword_id: objectId,
        status: z.enum(['active', 'paused']).optional(),
        cpc_bid_minor: z.number().int().positive().optional(),
      }),
      async execute(input) {
        return client.request('PATCH', `/v1/ads/google/keywords/${input.keyword_id}`, {
          ...body(input),
          status: input.status,
          cpcBidMinor: input.cpc_bid_minor,
        });
      },
    },

    {
      name: 'delete_google_keyword',
      description: 'Remove a Google Ads keyword. Needs the ads and publish scopes.',
      inputSchema: z.object({ ...writeScope, keyword_id: objectId }),
      async execute(input) {
        return client.delete(`/v1/ads/google/keywords/${input.keyword_id}`, body(input));
      },
    },

    {
      name: 'google_keyword_ideas',
      description:
        'Find Google Ads keywords to bid on, from seed terms, a landing page, or both. Needs the ads scope.',
      inputSchema: z.object({
        ...writeScope,
        seeds: z.array(z.string().min(1).max(80)).max(20).optional(),
        url: z.string().url().optional().describe('A landing page to read ideas from'),
        language_id: z.string().optional(),
        geo_target_ids: z.array(z.string()).max(10).optional(),
      }),
      async execute(input) {
        return client.post('/v1/ads/google/keyword-ideas', {
          ...body(input),
          seeds: input.seeds,
          url: input.url,
          languageId: input.language_id,
          geoTargetIds: input.geo_target_ids,
        });
      },
    },

    {
      name: 'list_google_search_terms',
      description:
        'Read what people actually searched on a Google Ads account, with the metrics each term earned. Needs the ads scope.',
      inputSchema: z.object({ ...readScope, ...dateRange }),
      async execute(input) {
        return client.get(
          '/v1/ads/google/search-terms',
          query(input, { since: input.since, until: input.until }),
        );
      },
    },

    {
      name: 'list_google_negative_keywords',
      description: 'List the negative keyword lists on a Google Ads account. Needs the ads scope.',
      inputSchema: z.object(readScope),
      async execute(input) {
        return client.get('/v1/ads/google/negative-keywords', query(input));
      },
    },

    {
      name: 'list_google_assets',
      description:
        'List a Google Ads account’s sitelinks, callouts and snippets, with the links that put each one under an ad. Needs the ads scope.',
      inputSchema: z.object(readScope),
      async execute(input) {
        return client.get('/v1/ads/google/assets', query(input));
      },
    },

    {
      name: 'create_google_asset',
      description:
        'Create a Google Ads sitelink, callout or structured snippet. Needs the ads and publish scopes.',
      inputSchema: z.object({
        ...writeScope,
        spec: z.discriminatedUnion('kind', [
          z.object({
            kind: z.literal('sitelink'),
            text: z.string().min(1).max(25),
            description1: z.string().max(35).optional(),
            description2: z.string().max(35).optional(),
            final_url: z.string().url(),
          }),
          z.object({ kind: z.literal('callout'), text: z.string().min(1).max(25) }),
          z.object({
            kind: z.literal('snippet'),
            header: z.string().min(1).max(25),
            values: z.array(z.string().min(1).max(25)).min(3).max(10),
          }),
        ]),
      }),
      async execute(input) {
        const spec = input.spec;
        return client.post('/v1/ads/google/assets', {
          ...body(input),
          spec:
            spec.kind === 'sitelink'
              ? {
                  kind: 'sitelink',
                  text: spec.text,
                  description1: spec.description1,
                  description2: spec.description2,
                  finalUrl: spec.final_url,
                }
              : spec,
        });
      },
    },

    {
      name: 'list_google_asset_groups',
      description:
        'List the Performance Max asset groups on a Google Ads account, or on one campaign. Needs the ads scope.',
      inputSchema: z.object({
        ...readScope,
        campaign_id: objectId.optional().describe('Limit to one campaign'),
      }),
      async execute(input) {
        return client.get(
          '/v1/ads/google/asset-groups',
          query(input, { campaign_id: input.campaign_id }),
        );
      },
    },

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
