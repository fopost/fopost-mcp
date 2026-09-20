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
  goal: z
    .enum([
      'engagement',
      'traffic',
      'awareness',
      'video_views',
      'messages',
      'calls',
      'whatsapp',
      'sales',
    ])
    .describe('Check list_ad_goals first; a goal the deployment cannot run is refused'),
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

function targetingBody(t: z.infer<typeof adTargeting>) {
  return {
    countries: t.countries,
    ageMin: t.age_min,
    ageMax: t.age_max,
    gender: t.gender,
    audienceIds: t.audience_ids,
    locations: t.locations,
    interests: t.interests,
    behaviors: t.behaviors,
    income: t.income,
  };
}

const urlTags = z
  .string()
  .max(1000)
  .optional()
  .describe(
    'Query string appended to every link in the ad, e.g. `utm_source=meta&utm_medium=paid`',
  );

const creativeCard = z.object({
  media_url: z.string().min(1).describe('A library image'),
  destination_url: z.string().url().optional(),
  headline: z.string().max(255).optional(),
  description: z.string().max(255).optional(),
});

const metaId = z.string().min(1).max(64).describe('Ad platform object id');
const objectStatus = z.enum(['active', 'paused']);
const pausedFlag = z.boolean().optional().describe('Default true; set false to go live at once');

/** Reads take an optional workspace; changes must name it. */
const metaRead = {
  workspace_id: z.string().uuid().optional(),
  connection_id: z.string().uuid().describe('An ads connection in the workspace'),
};
const metaWrite = {
  workspace_id: z.string().uuid(),
  connection_id: z.string().uuid().describe('An ads connection in the workspace'),
};

function metaQuery(input: { workspace_id?: string; connection_id: string }) {
  return { workspace_id: input.workspace_id, connection_id: input.connection_id };
}

const insightsRange = {
  since: z.string().describe('YYYY-MM-DD, inclusive'),
  until: z.string().describe('YYYY-MM-DD, inclusive'),
  breakdown: z.enum(['age', 'gender', 'placement', 'country']).optional(),
  daily: z.boolean().optional().describe('Add a day-by-day timeline'),
};

function rangeQuery(input: { since: string; until: string; breakdown?: string; daily?: boolean }) {
  return {
    since: input.since,
    until: input.until,
    breakdown: input.breakdown,
    daily: input.daily === undefined ? undefined : String(input.daily),
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
        url_tags: urlTags,
      }),
      async execute(input) {
        return client.post('/v1/ads', {
          ...adBaseBody(input),
          pageId: input.page_id,
          text: input.text,
          headline: input.headline,
          destinationUrl: input.destination_url,
          mediaUrl: input.media_url,
          urlTags: input.url_tags,
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

    {
      name: 'get_ad_account_tree',
      description:
        'Read the campaigns, ad sets and ads on one ad account, live from the ad platform. Needs the ads scope.',
      inputSchema: z.object({
        ...metaRead,
        ad_account_id: z.string().describe('Ad account id, `act_…`'),
      }),
      async execute(input) {
        return client.get(`/v1/ads/accounts/${input.ad_account_id}/tree`, metaQuery(input));
      },
    },

    {
      name: 'create_ad_campaign',
      description:
        'Create a campaign on an ad account. Starts paused unless paused is false. Needs the ads and publish scopes.',
      inputSchema: z.object({
        ...metaWrite,
        ad_account_id: z.string().describe('Ad account id, `act_…`'),
        name: z.string().min(1).max(255),
        goal: z.enum(['engagement', 'traffic', 'awareness', 'video_views']),
        paused: pausedFlag,
      }),
      async execute(input) {
        return client.post('/v1/ads/campaigns', {
          workspaceId: input.workspace_id,
          connectionId: input.connection_id,
          adAccountId: input.ad_account_id,
          name: input.name,
          goal: input.goal,
          paused: input.paused,
        });
      },
    },

    {
      name: 'get_ad_campaign',
      description: 'Read one campaign by its ad platform id. Needs the ads scope.',
      inputSchema: z.object({ id: metaId, ...metaRead }),
      async execute(input) {
        return client.get(`/v1/ads/campaigns/${input.id}`, metaQuery(input));
      },
    },

    {
      name: 'update_ad_campaign',
      description: 'Rename, pause or resume a campaign. Needs the ads and publish scopes.',
      inputSchema: z.object({
        id: metaId,
        ...metaWrite,
        name: z.string().min(1).max(255).optional(),
        status: objectStatus.optional(),
      }),
      async execute(input) {
        return client.request(
          'PATCH',
          `/v1/ads/campaigns/${input.id}`,
          { name: input.name, status: input.status },
          metaQuery(input),
        );
      },
    },

    {
      name: 'delete_ad_campaign',
      description:
        'Delete a campaign and everything beneath it on the ad platform. Cannot be undone. Needs the ads and publish scopes.',
      inputSchema: z.object({ id: metaId, ...metaWrite }),
      async execute(input) {
        return client.request(
          'DELETE',
          `/v1/ads/campaigns/${input.id}`,
          undefined,
          metaQuery(input),
        );
      },
    },

    {
      name: 'duplicate_ad_campaign',
      description:
        'Copy a campaign with everything beneath it. The copy starts paused unless paused is false. Needs the ads and publish scopes.',
      inputSchema: z.object({ id: metaId, ...metaWrite, paused: pausedFlag }),
      async execute(input) {
        return client.request(
          'POST',
          `/v1/ads/campaigns/${input.id}/duplicate`,
          { paused: input.paused },
          metaQuery(input),
        );
      },
    },

    {
      name: 'create_ad_set',
      description:
        'Create an ad set with budget and targeting inside a campaign. Starts paused unless paused is false. Needs the ads and publish scopes.',
      inputSchema: z.object({
        ...metaWrite,
        campaign_id: metaId,
        page_id: z.string().describe('Page the ads in this set run as'),
        name: z.string().min(1).max(255),
        goal: z.enum(['engagement', 'traffic', 'awareness', 'video_views']),
        budget: adBudget,
        targeting: adTargeting,
        paused: pausedFlag,
      }),
      async execute(input) {
        return client.post('/v1/ads/ad-sets', {
          workspaceId: input.workspace_id,
          connectionId: input.connection_id,
          campaignId: input.campaign_id,
          pageId: input.page_id,
          name: input.name,
          goal: input.goal,
          budget: {
            minor: input.budget.minor,
            type: input.budget.type,
            endAt: input.budget.end_at,
          },
          targeting: targetingBody(input.targeting),
          paused: input.paused,
        });
      },
    },

    {
      name: 'get_ad_set',
      description: 'Read one ad set by its ad platform id. Needs the ads scope.',
      inputSchema: z.object({ id: metaId, ...metaRead }),
      async execute(input) {
        return client.get(`/v1/ads/ad-sets/${input.id}`, metaQuery(input));
      },
    },

    {
      name: 'update_ad_set',
      description:
        'Rename, pause, resume, rebudget or retarget an ad set. Needs the ads and publish scopes.',
      inputSchema: z.object({
        id: metaId,
        ...metaWrite,
        name: z.string().min(1).max(255).optional(),
        status: objectStatus.optional(),
        budget_minor: z
          .number()
          .int()
          .positive()
          .optional()
          .describe('New budget in minor units; the budget type stays'),
        end_at: z.string().optional().describe('ISO 8601'),
        targeting: adTargeting.optional(),
      }),
      async execute(input) {
        return client.request(
          'PATCH',
          `/v1/ads/ad-sets/${input.id}`,
          {
            name: input.name,
            status: input.status,
            budgetMinor: input.budget_minor,
            endAt: input.end_at,
            targeting: input.targeting ? targetingBody(input.targeting) : undefined,
          },
          metaQuery(input),
        );
      },
    },

    {
      name: 'delete_ad_set',
      description:
        'Delete an ad set and its ads on the ad platform. Cannot be undone. Needs the ads and publish scopes.',
      inputSchema: z.object({ id: metaId, ...metaWrite }),
      async execute(input) {
        return client.request('DELETE', `/v1/ads/ad-sets/${input.id}`, undefined, metaQuery(input));
      },
    },

    {
      name: 'duplicate_ad_set',
      description:
        'Copy an ad set with its ads. The copy starts paused unless paused is false. Needs the ads and publish scopes.',
      inputSchema: z.object({ id: metaId, ...metaWrite, paused: pausedFlag }),
      async execute(input) {
        return client.request(
          'POST',
          `/v1/ads/ad-sets/${input.id}/duplicate`,
          { paused: input.paused },
          metaQuery(input),
        );
      },
    },

    {
      name: 'create_network_ad',
      description:
        'Create an ad inside an ad set from an existing creative. Starts paused unless paused is false. Needs the ads and publish scopes.',
      inputSchema: z.object({
        ...metaWrite,
        ad_set_id: metaId,
        creative_id: metaId.describe('From create_ad_creative or list_ad_creatives'),
        name: z.string().min(1).max(255),
        paused: pausedFlag,
      }),
      async execute(input) {
        return client.post('/v1/ads/ads', {
          workspaceId: input.workspace_id,
          connectionId: input.connection_id,
          adSetId: input.ad_set_id,
          creativeId: input.creative_id,
          name: input.name,
          paused: input.paused,
        });
      },
    },

    {
      name: 'get_network_ad',
      description: 'Read one ad inside an ad set by its ad platform id. Needs the ads scope.',
      inputSchema: z.object({ id: metaId, ...metaRead }),
      async execute(input) {
        return client.get(`/v1/ads/ads/${input.id}`, metaQuery(input));
      },
    },

    {
      name: 'update_network_ad',
      description:
        'Rename, pause, resume or swap the creative of an ad inside an ad set. Needs the ads and publish scopes.',
      inputSchema: z.object({
        id: metaId,
        ...metaWrite,
        name: z.string().min(1).max(255).optional(),
        status: objectStatus.optional(),
        creative_id: metaId.optional(),
      }),
      async execute(input) {
        return client.request(
          'PATCH',
          `/v1/ads/ads/${input.id}`,
          { name: input.name, status: input.status, creativeId: input.creative_id },
          metaQuery(input),
        );
      },
    },

    {
      name: 'delete_network_ad',
      description:
        'Delete an ad inside an ad set on the ad platform. Cannot be undone. Needs the ads and publish scopes.',
      inputSchema: z.object({ id: metaId, ...metaWrite }),
      async execute(input) {
        return client.request('DELETE', `/v1/ads/ads/${input.id}`, undefined, metaQuery(input));
      },
    },

    {
      name: 'duplicate_network_ad',
      description:
        'Copy an ad inside its ad set. The copy starts paused unless paused is false. Needs the ads and publish scopes.',
      inputSchema: z.object({ id: metaId, ...metaWrite, paused: pausedFlag }),
      async execute(input) {
        return client.request(
          'POST',
          `/v1/ads/ads/${input.id}/duplicate`,
          { paused: input.paused },
          metaQuery(input),
        );
      },
    },

    {
      name: 'bulk_set_ad_status',
      description:
        'Pause or resume up to 50 campaigns, ad sets and ads at once; each reports its own outcome. Needs the ads and publish scopes.',
      inputSchema: z.object({
        ...metaWrite,
        status: objectStatus,
        objects: z
          .array(z.object({ id: metaId, level: z.enum(['campaign', 'ad_set', 'ad']) }))
          .min(1)
          .max(50),
      }),
      async execute(input) {
        return client.post('/v1/ads/status', {
          workspaceId: input.workspace_id,
          connectionId: input.connection_id,
          status: input.status,
          objects: input.objects,
        });
      },
    },

    {
      name: 'list_ad_creatives',
      description: 'List the creatives on an ad account. Needs the ads scope.',
      inputSchema: z.object({
        ...metaRead,
        ad_account_id: z.string().describe('Ad account id, `act_…`'),
      }),
      async execute(input) {
        return client.get('/v1/ads/creatives', {
          ...metaQuery(input),
          ad_account_id: input.ad_account_id,
        });
      },
    },

    {
      name: 'create_ad_creative',
      description:
        'Create an image, video or carousel creative from library media; nothing runs until an ad uses it. Needs the ads scope.',
      inputSchema: z.object({
        ...metaWrite,
        ad_account_id: z.string().describe('Ad account id, `act_…`'),
        page_id: z.string().describe('Page id the creative runs as'),
        name: z.string().min(1).max(255),
        format: z.enum(['image', 'video', 'carousel']),
        text: z.string().min(1).max(2000).describe('Primary text'),
        headline: z.string().max(255).optional(),
        destination_url: z.string().url().optional(),
        call_to_action: z
          .enum([
            'LEARN_MORE',
            'SHOP_NOW',
            'SIGN_UP',
            'SUBSCRIBE',
            'CONTACT_US',
            'DOWNLOAD',
            'GET_OFFER',
            'BOOK_NOW',
            'APPLY_NOW',
            'WATCH_MORE',
          ])
          .optional()
          .describe('Defaults to LEARN_MORE'),
        url_tags: urlTags,
        media_url: z
          .string()
          .optional()
          .describe('A media library asset url: the image, or the video. Required for video'),
        thumbnail_media_url: z
          .string()
          .optional()
          .describe("A video's poster frame, a library image"),
        cards: z
          .array(creativeCard)
          .min(2)
          .max(10)
          .optional()
          .describe('Carousel cards; required for carousel'),
      }),
      async execute(input) {
        return client.post('/v1/ads/creatives', {
          workspaceId: input.workspace_id,
          connectionId: input.connection_id,
          adAccountId: input.ad_account_id,
          pageId: input.page_id,
          name: input.name,
          format: input.format,
          text: input.text,
          headline: input.headline,
          destinationUrl: input.destination_url,
          callToAction: input.call_to_action,
          urlTags: input.url_tags,
          mediaUrl: input.media_url,
          thumbnailMediaUrl: input.thumbnail_media_url,
          cards: input.cards?.map((c: z.infer<typeof creativeCard>) => ({
            mediaUrl: c.media_url,
            destinationUrl: c.destination_url,
            headline: c.headline,
            description: c.description,
          })),
        });
      },
    },

    {
      name: 'get_ad_creative',
      description: 'Read one creative by its ad platform id. Needs the ads scope.',
      inputSchema: z.object({ id: metaId, ...metaRead }),
      async execute(input) {
        return client.get(`/v1/ads/creatives/${input.id}`, metaQuery(input));
      },
    },

    {
      name: 'delete_ad_creative',
      description: 'Delete a creative on the ad platform. Cannot be undone. Needs the ads scope.',
      inputSchema: z.object({ id: metaId, ...metaWrite }),
      async execute(input) {
        return client.request(
          'DELETE',
          `/v1/ads/creatives/${input.id}`,
          undefined,
          metaQuery(input),
        );
      },
    },

    {
      name: 'get_audience',
      description:
        'Read one saved audience with its size and delivery status. Needs the ads scope.',
      inputSchema: z.object({ id: metaId, ...metaRead }),
      async execute(input) {
        return client.get(`/v1/ads/audiences/${input.id}`, metaQuery(input));
      },
    },

    {
      name: 'update_audience',
      description: 'Rename a saved audience or change its description. Needs the ads scope.',
      inputSchema: z.object({
        id: metaId,
        ...metaWrite,
        name: z.string().min(1).max(255).optional(),
        description: z.string().max(500).optional(),
      }),
      async execute(input) {
        return client.request(
          'PATCH',
          `/v1/ads/audiences/${input.id}`,
          { name: input.name, description: input.description },
          metaQuery(input),
        );
      },
    },

    {
      name: 'delete_audience',
      description:
        'Delete a saved audience on the ad platform. Cannot be undone. Needs the ads scope.',
      inputSchema: z.object({ id: metaId, ...metaWrite }),
      async execute(input) {
        return client.request(
          'DELETE',
          `/v1/ads/audiences/${input.id}`,
          undefined,
          metaQuery(input),
        );
      },
    },

    {
      name: 'add_audience_users',
      description:
        'Add customer emails to a custom audience; they are hashed before they leave FoPost. Needs the ads scope.',
      inputSchema: z.object({
        id: metaId,
        ...metaWrite,
        emails: z.array(z.string().email()).min(1).max(10000),
      }),
      async execute(input) {
        return client.request(
          'POST',
          `/v1/ads/audiences/${input.id}/users`,
          { emails: input.emails },
          metaQuery(input),
        );
      },
    },

    {
      name: 'estimate_ad_reach',
      description:
        'Estimate how many people a targeting would reach before spending anything. Needs the ads scope.',
      inputSchema: z.object({
        ...metaWrite,
        ad_account_id: z.string().describe('Ad account id, `act_…`'),
        page_id: z.string(),
        targeting: adTargeting,
      }),
      async execute(input) {
        return client.post('/v1/ads/reach-estimate', {
          workspaceId: input.workspace_id,
          connectionId: input.connection_id,
          adAccountId: input.ad_account_id,
          pageId: input.page_id,
          targeting: targetingBody(input.targeting),
        });
      },
    },

    {
      name: 'get_ad_object_insights',
      description:
        'Read insights for any campaign, ad set or ad on a connection over a date range, with an optional breakdown and daily timeline. Needs the ads scope.',
      inputSchema: z.object({
        ...metaRead,
        object_id: metaId.describe('Campaign, ad set or ad id on the ad platform'),
        ...insightsRange,
      }),
      async execute(input) {
        return client.get('/v1/ads/insights', {
          ...metaQuery(input),
          object_id: input.object_id,
          ...rangeQuery(input),
        });
      },
    },

    {
      name: 'get_ad_insights',
      description:
        'Read insights for an ad created through FoPost over a date range, with an optional breakdown and daily timeline. Needs the ads scope.',
      inputSchema: z.object({
        id: z.string().uuid().describe('Ad id (uuid)'),
        workspace_id: z.string().uuid(),
        ...insightsRange,
      }),
      async execute(input) {
        return client.get(`/v1/ads/${input.id}/insights`, {
          workspace_id: input.workspace_id,
          ...rangeQuery(input),
        });
      },
    },

    {
      name: 'get_lead_form',
      description: 'Read one lead form with its questions and privacy policy. Needs the ads scope.',
      inputSchema: z.object({
        form_id: z.string().describe('Lead form id'),
        ...metaRead,
        page_id: z.string(),
      }),
      async execute(input) {
        return client.get(`/v1/ads/lead-forms/${input.form_id}`, {
          ...metaQuery(input),
          page_id: input.page_id,
        });
      },
    },

    {
      name: 'archive_lead_form',
      description: 'Archive a lead form so it stops collecting leads. Needs the ads scope.',
      inputSchema: z.object({
        form_id: z.string().describe('Lead form id'),
        ...metaWrite,
        page_id: z.string(),
      }),
      async execute(input) {
        return client.post(`/v1/ads/lead-forms/${input.form_id}/archive`, {
          workspaceId: input.workspace_id,
          connectionId: input.connection_id,
          pageId: input.page_id,
        });
      },
    },

    {
      name: 'list_leads_feed',
      description:
        'List leads stored from subscribed pages, newest first; pass next_cursor back as cursor for the next page. Needs the ads scope.',
      inputSchema: z.object({
        workspace_id: z.string().uuid().optional(),
        form_id: z.string().optional(),
        page_id: z.string().optional(),
        cursor: z.string().optional().describe('nextCursor from the previous page'),
        limit: z.number().int().min(1).max(100).optional(),
      }),
      async execute(input) {
        return client.get('/v1/ads/leads', input);
      },
    },

    {
      name: 'list_lead_pages',
      description: 'List the pages subscribed to new-lead notifications. Needs the ads scope.',
      inputSchema: workspaceFilter,
      async execute(input) {
        return client.get('/v1/ads/lead-pages', input);
      },
    },

    {
      name: 'subscribe_lead_page',
      description:
        'Turn on new-lead notifications for a page and backfill its recent leads into the feed. Needs the ads scope.',
      inputSchema: z.object({ ...metaWrite, page_id: z.string() }),
      async execute(input) {
        return client.post('/v1/ads/lead-pages', {
          workspaceId: input.workspace_id,
          connectionId: input.connection_id,
          pageId: input.page_id,
        });
      },
    },

    {
      name: 'unsubscribe_lead_page',
      description: 'Turn off new-lead notifications for a page. Needs the ads scope.',
      inputSchema: z.object({ page_id: z.string(), ...metaWrite }),
      async execute(input) {
        return client.request(
          'DELETE',
          `/v1/ads/lead-pages/${input.page_id}`,
          undefined,
          metaQuery(input),
        );
      },
    },
    {
      name: 'list_ad_goals',
      description:
        'List the goals this ads connection can run right now. Ask rather than assume: a goal the ' +
        'deployment is not set up for is absent here and is refused if sent anyway. Needs the ads scope.',
      inputSchema: z.object(metaRead),
      async execute(input) {
        return client.get('/v1/ads/goals', metaQuery(input));
      },
    },

    {
      name: 'list_ad_catalogs',
      description:
        'List the product catalogs this connection reaches, read live and never stored. A catalog ' +
        'ad runs from a product set inside one. Needs the ads scope.',
      inputSchema: z.object(metaRead),
      async execute(input) {
        return client.get('/v1/ads/catalogs', metaQuery(input));
      },
    },

    {
      name: 'create_ad_catalog',
      description:
        "Create a product catalog on the connection's business portfolio. Needs the ads and " +
        'publish scopes.',
      inputSchema: z.object({
        ...metaWrite,
        name: z.string().min(1).max(255),
        vertical: z.string().optional().describe('Catalog vertical; commerce by default'),
      }),
      async execute(input) {
        return client.post('/v1/ads/catalogs', {
          workspaceId: input.workspace_id,
          connectionId: input.connection_id,
          name: input.name,
          vertical: input.vertical,
        });
      },
    },

    {
      name: 'list_catalog_products',
      description:
        "List one page of a catalog's products. Pass next_cursor back as after for the next page. " +
        'Needs the ads scope.',
      inputSchema: z.object({
        ...metaRead,
        catalog_id: z.string().describe('From list_ad_catalogs'),
        after: z.string().optional().describe('A next_cursor from a previous page'),
      }),
      async execute(input) {
        return client.get(`/v1/ads/catalogs/${input.catalog_id}/products`, {
          ...metaQuery(input),
          after: input.after,
        });
      },
    },

    {
      name: 'write_catalog_products',
      description:
        'Add, replace or remove up to 500 products in one batch, keyed by your own retailer_id. ' +
        'Upserts and deletes travel together. Needs the ads and publish scopes.',
      inputSchema: z.object({
        ...metaWrite,
        catalog_id: z.string().describe('From list_ad_catalogs'),
        products: z
          .array(
            z.object({
              op: z.enum(['upsert', 'delete']),
              retailer_id: z.string().describe('Your own key for the product'),
              name: z.string().optional(),
              description: z.string().optional(),
              url: z.string().optional().describe('The product page'),
              image_url: z.string().optional(),
              price_minor: z
                .number()
                .int()
                .optional()
                .describe('Minor units of currency: 12900 with USD is $129.00'),
              currency: z.string().length(3).optional(),
              availability: z.string().optional().describe('in stock, out of stock, preorder, …'),
              condition: z.enum(['new', 'refurbished', 'used']).optional(),
              brand: z.string().optional(),
            }),
          )
          .min(1)
          .max(500),
      }),
      async execute(input) {
        return client.post(`/v1/ads/catalogs/${input.catalog_id}/products`, {
          workspaceId: input.workspace_id,
          connectionId: input.connection_id,
          products: input.products.map((product) => ({
            op: product.op,
            retailerId: product.retailer_id,
            name: product.name,
            description: product.description,
            url: product.url,
            imageUrl: product.image_url,
            priceMinor: product.price_minor,
            currency: product.currency,
            availability: product.availability,
            condition: product.condition,
            brand: product.brand,
          })),
        });
      },
    },

    {
      name: 'list_catalog_product_sets',
      description:
        'List the product sets in a catalog. A catalog ad runs from a set, not the whole catalog. ' +
        'Needs the ads scope.',
      inputSchema: z.object({
        ...metaRead,
        catalog_id: z.string().describe('From list_ad_catalogs'),
      }),
      async execute(input) {
        return client.get(`/v1/ads/catalogs/${input.catalog_id}/product-sets`, metaQuery(input));
      },
    },

    {
      name: 'create_catalog_product_set',
      description:
        'Create a product set in a catalog. Without a filter the set is the whole catalog. Needs ' +
        'the ads and publish scopes.',
      inputSchema: z.object({
        ...metaWrite,
        catalog_id: z.string().describe('From list_ad_catalogs'),
        name: z.string().min(1).max(255),
        filter: z.record(z.unknown()).optional().describe("The network's own product-set filter"),
      }),
      async execute(input) {
        return client.post(`/v1/ads/catalogs/${input.catalog_id}/product-sets`, {
          workspaceId: input.workspace_id,
          connectionId: input.connection_id,
          name: input.name,
          filter: input.filter,
        });
      },
    },

    {
      name: 'list_reach_frequency',
      description:
        'List the reach-and-frequency predictions on an ad account. A prediction prices a fixed ' +
        'flight; nothing is bought until it is reserved. Needs the ads scope.',
      inputSchema: z.object({ ...metaRead, ad_account_id: z.string().describe('`act_…`') }),
      async execute(input) {
        return client.get('/v1/ads/reach-frequency', {
          ...metaQuery(input),
          ad_account_id: input.ad_account_id,
        });
      },
    },

    {
      name: 'search_ad_library',
      description:
        'Search the public ad archive for ads anyone is running, by keyword or by page. Read live ' +
        'on every call and stored nowhere, so an ad that stops running is simply absent from the ' +
        'next search. Needs the ads scope.',
      inputSchema: z.object({
        ...metaRead,
        countries: z
          .array(z.string().length(2))
          .min(1)
          .describe('ISO 3166-1 alpha-2 codes the ad reached'),
        q: z.string().optional().describe('Keyword or page name; required unless page_ids is set'),
        page_ids: z.array(z.string()).max(10).optional(),
        active_status: z.enum(['ACTIVE', 'INACTIVE', 'ALL']).optional(),
        limit: z.number().int().min(1).max(100).optional(),
        after: z.string().optional(),
      }),
      async execute(input) {
        return client.get('/v1/ads/library', {
          ...metaQuery(input),
          countries: input.countries.join(','),
          q: input.q,
          page_ids: input.page_ids?.join(','),
          active_status: input.active_status,
          limit: input.limit === undefined ? undefined : String(input.limit),
          after: input.after,
        });
      },
    },

    {
      name: 'list_ad_account_activity',
      description:
        "Read an ad account's change log: who changed what, and when. Read live and never stored. " +
        'Needs the ads scope.',
      inputSchema: z.object({
        ...metaRead,
        ad_account_id: z.string().describe('`act_…`'),
        since: z.string().optional().describe('YYYY-MM-DD'),
        until: z.string().optional().describe('YYYY-MM-DD'),
      }),
      async execute(input) {
        return client.get('/v1/ads/account/activity', {
          ...metaQuery(input),
          ad_account_id: input.ad_account_id,
          since: input.since,
          until: input.until,
        });
      },
    },
  ];
}
