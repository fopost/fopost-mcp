import { z } from 'zod';
import type { FoPostClient } from '../client.js';
import type { ToolDefinition } from '../types.js';

const namedItem = z.object({ id: z.string(), name: z.string() });

const adBudget = z.object({
  minor: z.number().int().positive().describe('Amount in the ad account currency, minor units'),
  type: z.enum(['daily', 'lifetime']),
  end_at: z.string().optional().describe('ISO 8601'),
});

const adTargeting = z.object({
  countries: z
    .array(z.string().length(2))
    .describe('ISO 3166-1 alpha-2 codes. At least one country or one location is required.'),
  age_min: z.number().int().min(13).max(65),
  age_max: z.number().int().min(13).max(65),
  gender: z.enum(['all', 'male', 'female']),
  audience_ids: z.array(z.string()).optional(),
  locations: z
    .array(
      z.object({
        key: z.string(),
        name: z.string(),
        type: z.enum(['region', 'city', 'zip', 'geo_market']),
      }),
    )
    .optional()
    .describe('Locations below country level, from search_ad_targeting'),
  interests: z.array(namedItem).optional(),
  behaviors: z.array(namedItem).optional(),
  income: z.array(namedItem).optional(),
});

const adBase = {
  workspace_id: z.string().uuid(),
  connection_id: z.string().uuid().describe('An ads connection in the workspace'),
  ad_account_id: z.string().describe('Ad account id, `act_…`'),
  name: z.string().min(1).max(255),
  goal: z.enum(['engagement', 'traffic', 'awareness', 'video_views']),
  budget: adBudget,
  targeting: adTargeting,
  paused: z.boolean().optional().describe('Default true; set false to go live at once'),
};

type AdBaseInput = {
  workspace_id: string;
  connection_id: string;
  ad_account_id: string;
  name: string;
  goal: string;
  budget: z.infer<typeof adBudget>;
  targeting: z.infer<typeof adTargeting>;
  paused?: boolean;
};

function adBaseBody(input: AdBaseInput) {
  return {
    workspaceId: input.workspace_id,
    connectionId: input.connection_id,
    adAccountId: input.ad_account_id,
    name: input.name,
    goal: input.goal,
    budget: { minor: input.budget.minor, type: input.budget.type, endAt: input.budget.end_at },
    targeting: {
      countries: input.targeting.countries,
      ageMin: input.targeting.age_min,
      ageMax: input.targeting.age_max,
      gender: input.targeting.gender,
      audienceIds: input.targeting.audience_ids,
      locations: input.targeting.locations,
      interests: input.targeting.interests,
      behaviors: input.targeting.behaviors,
      income: input.targeting.income,
    },
    paused: input.paused,
  };
}

const workspaceFilter = z.object({
  workspace_id: z.string().uuid().optional().describe('Restrict to one workspace'),
});

export function adsTools(client: FoPostClient): ToolDefinition[] {
  return [
    {
      name: 'list_ads',
      description:
        'List boosts and ads created through FoPost with insights from their last refresh. Needs the ads scope.',
      inputSchema: workspaceFilter,
      async execute(input) {
        return client.get('/v1/ads', input);
      },
    },

    {
      name: 'list_external_ads',
      description:
        'List ads on the connected ad accounts that were created elsewhere, read live. Needs the ads scope.',
      inputSchema: workspaceFilter,
      async execute(input) {
        return client.get('/v1/ads/external', input);
      },
    },

    {
      name: 'list_boostable_posts',
      description: 'List published posts that can be boosted as ads. Needs the ads scope.',
      inputSchema: workspaceFilter,
      async execute(input) {
        return client.get('/v1/ads/boostable', input);
      },
    },

    {
      name: 'list_ad_sources',
      description:
        'List ad connections with their ad accounts and pages, the ids boost_post and create_ad need. Needs the ads scope.',
      inputSchema: workspaceFilter,
      async execute(input) {
        return client.get('/v1/ads/sources', input);
      },
    },

    {
      name: 'boost_post',
      description:
        'Boost a published post as an ad. Starts paused unless paused is false. Needs the ads and publish scopes.',
      inputSchema: z.object({
        ...adBase,
        post_id: z.string().uuid().describe('A published FoPost post'),
        account_id: z.string().uuid().describe('The account the post was delivered to'),
      }),
      async execute(input) {
        return client.post('/v1/ads/boost', {
          ...adBaseBody(input),
          postId: input.post_id,
          accountId: input.account_id,
        });
      },
    },

    {
      name: 'create_ad',
      description:
        'Create a new ad from text, an optional headline, link and media. Starts paused unless paused is false. Needs the ads and publish scopes.',
      inputSchema: z.object({
        ...adBase,
        page_id: z.string().describe('Page id the ad is published from'),
        text: z.string().min(1).max(125),
        headline: z.string().max(40).optional(),
        destination_url: z.string().url().optional(),
        media_url: z.string().optional().describe('A media library asset url'),
      }),
      async execute(input) {
        return client.post('/v1/ads', {
          ...adBaseBody(input),
          pageId: input.page_id,
          text: input.text,
          headline: input.headline,
          destinationUrl: input.destination_url,
          mediaUrl: input.media_url,
        });
      },
    },

    {
      name: 'set_ad_status',
      description: 'Pause or resume an ad. Needs the ads and publish scopes.',
      inputSchema: z.object({
        id: z.string().uuid().describe('Ad id (uuid)'),
        workspace_id: z.string().uuid(),
        status: z.enum(['active', 'paused']),
      }),
      async execute(input) {
        return client.request(
          'PATCH',
          `/v1/ads/${input.id}`,
          { status: input.status },
          { workspace_id: input.workspace_id },
        );
      },
    },

    {
      name: 'refresh_ad',
      description:
        'Re-read an ad delivery status and lifetime insights from the ad platform. Needs the ads scope.',
      inputSchema: z.object({
        id: z.string().uuid().describe('Ad id (uuid)'),
        workspace_id: z.string().uuid(),
      }),
      async execute(input) {
        return client.request('POST', `/v1/ads/${input.id}/refresh`, undefined, {
          workspace_id: input.workspace_id,
        });
      },
    },

    {
      name: 'delete_ad',
      description:
        'End delivery and delete an ad on the ad platform. Cannot be undone. Needs the ads and publish scopes.',
      inputSchema: z.object({
        id: z.string().uuid().describe('Ad id (uuid)'),
        workspace_id: z.string().uuid(),
      }),
      async execute(input) {
        return client.request('DELETE', `/v1/ads/${input.id}`, undefined, {
          workspace_id: input.workspace_id,
        });
      },
    },

    {
      name: 'list_audiences',
      description:
        'List saved audiences and pixels on an ad account for targeting. Needs the ads scope.',
      inputSchema: z.object({
        workspace_id: z.string().uuid().optional(),
        connection_id: z.string().uuid(),
        ad_account_id: z.string().describe('Ad account id, `act_…`'),
      }),
      async execute(input) {
        return client.get('/v1/ads/audiences', input);
      },
    },

    {
      name: 'search_ad_targeting',
      description:
        'Search targeting options (country, region, city, zip, metro, interest, behavior, income) by name for boost_post and create_ad. Needs the ads scope.',
      inputSchema: z.object({
        workspace_id: z.string().uuid().optional(),
        connection_id: z.string().uuid(),
        type: z.enum([
          'country',
          'region',
          'city',
          'zip',
          'metro',
          'interest',
          'behavior',
          'income',
        ]),
        q: z.string().max(100).optional(),
      }),
      async execute(input) {
        return client.get('/v1/ads/targeting/search', input);
      },
    },

    {
      name: 'list_lead_forms',
      description: 'List lead forms on the connected pages. Needs the ads scope.',
      inputSchema: workspaceFilter,
      async execute(input) {
        return client.get('/v1/ads/lead-forms', input);
      },
    },

    {
      name: 'list_leads',
      description:
        'List one page of leads from a lead form; pass next_cursor back as after for the next page. Needs the ads scope.',
      inputSchema: z.object({
        form_id: z.string().describe('Lead form id'),
        workspace_id: z.string().uuid().optional(),
        connection_id: z.string().uuid(),
        page_id: z.string(),
        after: z.string().optional().describe('Cursor from the previous page'),
      }),
      async execute(input) {
        return client.get(`/v1/ads/lead-forms/${input.form_id}/leads`, {
          workspace_id: input.workspace_id,
          connection_id: input.connection_id,
          page_id: input.page_id,
          after: input.after,
        });
      },
    },
  ];
}
