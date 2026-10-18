import { z } from 'zod';
import type { FoPostClient } from '../client.js';
import type { ToolDefinition } from '../types.js';

/**
 * The workspace blog: a keyword plan, the articles written from it, and the
 * settings that say where a published article goes. An article is website
 * content, never a social post.
 *
 * Reads, settings, keyword edits and submitting for approval need the posts
 * scope; suggesting search terms, planning keywords, requesting an article and
 * regenerating one spend AI credits and need the ai scope; publishing needs
 * publish. The website signing secret and the website
 * test are deliberately not here; both stay in the dashboard.
 *
 * The workspace travels as `workspace_id` on the query and as `workspaceId` in
 * a request body, per the API's request schemas.
 */

const ARTICLE_STATUS = z.enum([
  'queued',
  'writing',
  'draft',
  'in_review',
  'scheduled',
  'publishing',
  'published',
  'failed',
  'rejected',
]);
const KEYWORD_STATUS = z.enum(['suggested', 'planned', 'written', 'dismissed']);
const GOAL = z.enum(['traffic', 'leads', 'sales', 'signups', 'authority']);
const IMAGE_TIER = z.enum(['draft', 'standard', 'best']);
const TARGET_KIND = z.enum(['product_blog', 'account', 'website']);

const workspaceId = z.string().uuid().describe('Workspace id (uuid)');
const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .describe('YYYY-MM-DD');

const workspaceQuery = (id: string) => ({ workspace_id: id });

const statusList = (status?: string[]) => (status?.length ? status.join(',') : undefined);

export function blogTools(client: FoPostClient): ToolDefinition[] {
  return [
    {
      name: 'blog_get_settings',
      description:
        'Read the blog settings for a workspace: goal, topic, audience, focus and avoid topics, language, how many articles are planned per week, how early a picked keyword starts being written, image quality tier, word range, brand voice, where published articles go, and the status of the last keyword research run. Needs the posts scope.',
      inputSchema: z.object({ workspace_id: workspaceId }),
      async execute({ workspace_id }) {
        return client.get('/v1/blog/settings', workspaceQuery(workspace_id));
      },
    },

    {
      name: 'blog_update_settings',
      description:
        'Change blog settings. Send only the fields to change. Setting website_url for the first time issues a signing secret that comes back once in this response and is never shown again; rotating it is dashboard only. Needs the posts scope.',
      inputSchema: z.object({
        workspace_id: workspaceId,
        site_url: z.string().url().nullable().optional().describe('The site the articles are for'),
        topic: z.string().nullable().optional(),
        audience: z.string().nullable().optional(),
        goal: GOAL.nullable()
          .optional()
          .describe('What the blog is for; steers suggested search terms and keyword ranking'),
        focus_topics: z
          .string()
          .nullable()
          .optional()
          .describe('What the blog wants to write about'),
        avoid_topics: z.string().nullable().optional().describe('What the blog never writes about'),
        language: z.string().optional(),
        location_code: z.number().int().optional().describe('Market for keyword research'),
        cadence_per_week: z
          .number()
          .int()
          .min(0)
          .max(7)
          .optional()
          .describe('Articles planned per week; 0 turns planning off'),
        review_hold_days: z
          .number()
          .int()
          .min(0)
          .max(14)
          .optional()
          .describe('Days before its planned date that a picked keyword starts being written'),
        image_tier: IMAGE_TIER.optional(),
        in_body_images: z.number().int().min(0).max(3).optional(),
        min_words: z.number().int().optional(),
        max_words: z.number().int().optional(),
        brand_voice_id: z.string().uuid().nullable().optional(),
        target_kind: TARGET_KIND.nullable()
          .optional()
          .describe(
            'Where a published article goes: the FoPost product blog, a connected account, or your own website',
          ),
        target_account_id: z
          .string()
          .uuid()
          .nullable()
          .optional()
          .describe('The connected account, when target_kind is account'),
        website_url: z
          .string()
          .url()
          .nullable()
          .optional()
          .describe(
            'Where published articles are delivered as a signed webhook, when target_kind is website',
          ),
      }),
      async execute(input) {
        return client.request('PATCH', '/v1/blog/settings', {
          workspaceId: input.workspace_id,
          siteUrl: input.site_url,
          topic: input.topic,
          audience: input.audience,
          goal: input.goal,
          focusTopics: input.focus_topics,
          avoidTopics: input.avoid_topics,
          language: input.language,
          locationCode: input.location_code,
          cadencePerWeek: input.cadence_per_week,
          reviewHoldDays: input.review_hold_days,
          imageTier: input.image_tier,
          inBodyImages: input.in_body_images,
          minWords: input.min_words,
          maxWords: input.max_words,
          brandVoiceId: input.brand_voice_id,
          targetKind: input.target_kind,
          targetAccountId: input.target_account_id,
          websiteUrl: input.website_url,
        });
      },
    },

    {
      name: 'blog_list_keywords',
      description:
        'List the keyword plan: each term with its search volume, difficulty, intent, status, the date it is planned for and why it fits the blog goal. Needs the posts scope.',
      inputSchema: z.object({
        workspace_id: workspaceId,
        status: z.array(KEYWORD_STATUS).max(4).optional().describe('Limit to these statuses'),
        limit: z.number().int().min(1).max(200).optional(),
      }),
      async execute(input) {
        return client.get('/v1/blog/keywords', {
          workspace_id: input.workspace_id,
          status: statusList(input.status),
          limit: input.limit,
        });
      },
    },

    {
      name: 'blog_suggest_seeds',
      description:
        'Suggest about 10 search terms from the blog goal and topics, for the user to edit before blog_plan_keywords. Pass the current seeds to refine them and a prompt to steer. Uses AI credits. Needs the ai scope.',
      inputSchema: z.object({
        workspace_id: workspaceId,
        seeds: z
          .array(z.string().min(1).max(80))
          .max(20)
          .optional()
          .describe('The current terms, to refine'),
        prompt: z
          .string()
          .max(500)
          .optional()
          .describe('How to steer the suggestions, e.g. more beginner terms'),
      }),
      async execute(input) {
        return client.post('/v1/blog/keywords/suggest', {
          workspaceId: input.workspace_id,
          seeds: input.seeds,
          prompt: input.prompt,
        });
      },
    },

    {
      name: 'blog_plan_keywords',
      description:
        'Research search terms in the background and answer queued. Results land as suggested keywords and do not fill the calendar; pick one with blog_update_keyword status planned. Follow the run in plan_run on blog_get_settings. Uses AI credits. Needs the ai scope.',
      inputSchema: z.object({
        workspace_id: workspaceId,
        seeds: z
          .array(z.string().min(1).max(80))
          .max(20)
          .optional()
          .describe('Terms to research; omit to derive them from the blog settings'),
      }),
      async execute(input) {
        return client.post('/v1/blog/keywords/plan', {
          workspaceId: input.workspace_id,
          seeds: input.seeds,
        });
      },
    },

    {
      name: 'blog_add_keyword',
      description:
        'Add a keyword to the plan by hand, optionally on a date. Needs the posts scope.',
      inputSchema: z.object({
        workspace_id: workspaceId,
        keyword: z.string().min(1).max(200),
        planned_for: isoDate.optional(),
      }),
      async execute(input) {
        return client.post('/v1/blog/keywords', {
          workspaceId: input.workspace_id,
          keyword: input.keyword,
          plannedFor: input.planned_for,
        });
      },
    },

    {
      name: 'blog_update_keyword',
      description:
        'Change a keyword: move it to another date, pick a suggestion by setting status planned (it takes the next free date), or dismiss it. Needs the posts scope.',
      inputSchema: z.object({
        workspace_id: workspaceId,
        id: z.string().uuid().describe('Keyword id, as blog_list_keywords returns it'),
        status: KEYWORD_STATUS.optional(),
        planned_for: isoDate.nullable().optional(),
      }),
      async execute(input) {
        return client.request(
          'PATCH',
          `/v1/blog/keywords/${input.id}`,
          { status: input.status, plannedFor: input.planned_for },
          workspaceQuery(input.workspace_id),
        );
      },
    },

    {
      name: 'blog_delete_keyword',
      description: 'Remove a keyword from the plan. Needs the posts scope.',
      inputSchema: z.object({ workspace_id: workspaceId, id: z.string().uuid() }),
      async execute(input) {
        return client.request(
          'DELETE',
          `/v1/blog/keywords/${input.id}`,
          undefined,
          workspaceQuery(input.workspace_id),
        );
      },
    },

    {
      name: 'blog_list_articles',
      description:
        'List articles, newest first, with title, keyword, status, word count and where each one was published. Needs the posts scope.',
      inputSchema: z.object({
        workspace_id: workspaceId,
        status: z.array(ARTICLE_STATUS).max(9).optional().describe('Limit to these statuses'),
        limit: z.number().int().min(1).max(200).optional(),
      }),
      async execute(input) {
        return client.get('/v1/blog/articles', {
          workspace_id: input.workspace_id,
          status: statusList(input.status),
          limit: input.limit,
        });
      },
    },

    {
      name: 'blog_request_article',
      description:
        'Ask for a new article from a title, a keyword, or a keyword already in the plan; exactly one of the three. It is written in the background and lands as a draft for review; read blog_get_article to see it. Uses AI credits. Needs the ai scope.',
      inputSchema: z
        .object({
          workspace_id: workspaceId,
          title: z.string().min(1).max(300).optional(),
          keyword: z.string().min(1).max(200).optional(),
          keyword_id: z.string().uuid().optional().describe('A keyword from the plan'),
          instructions: z
            .string()
            .max(4000)
            .optional()
            .describe('Anything the writer should know: angle, points to cover, what to avoid'),
        })
        .refine((v) => [v.title, v.keyword, v.keyword_id].filter(Boolean).length === 1, {
          message: 'Give exactly one of title, keyword or keyword_id',
        }),
      async execute(input) {
        return client.post('/v1/blog/articles', {
          workspaceId: input.workspace_id,
          title: input.title,
          keyword: input.keyword,
          keywordId: input.keyword_id,
          instructions: input.instructions,
        });
      },
    },

    {
      name: 'blog_get_article',
      description:
        'Read one article in full: outline, body as Markdown and HTML, images, excerpt, meta title and description, tags and status. Needs the posts scope.',
      inputSchema: z.object({ workspace_id: workspaceId, id: z.string().uuid() }),
      async execute(input) {
        return client.get(`/v1/blog/articles/${input.id}`, workspaceQuery(input.workspace_id));
      },
    },

    {
      name: 'blog_update_article',
      description:
        'Edit a draft or scheduled article: title, slug, excerpt, meta fields, body Markdown, tags, or the publish date. Give publish_at to put an article in review on the calendar, or null to return it to review; a draft answers 409 until blog_submit_article. An article being written or already published answers 409. Needs the posts scope.',
      inputSchema: z.object({
        workspace_id: workspaceId,
        id: z.string().uuid(),
        title: z.string().min(1).max(300).optional(),
        slug: z
          .string()
          .regex(/^[a-z0-9-]+$/)
          .optional(),
        excerpt: z.string().nullable().optional(),
        meta_title: z.string().nullable().optional(),
        meta_description: z.string().nullable().optional(),
        body_markdown: z.string().optional(),
        tags: z.array(z.string()).max(20).optional(),
        publish_at: z.string().datetime().nullable().optional(),
      }),
      async execute(input) {
        return client.request(
          'PATCH',
          `/v1/blog/articles/${input.id}`,
          {
            title: input.title,
            slug: input.slug,
            excerpt: input.excerpt,
            metaTitle: input.meta_title,
            metaDescription: input.meta_description,
            bodyMarkdown: input.body_markdown,
            tags: input.tags,
            publishAt: input.publish_at,
          },
          workspaceQuery(input.workspace_id),
        );
      },
    },

    {
      name: 'blog_regenerate_article',
      description:
        'Rewrite an article from scratch on the same keyword and instructions. The current draft is replaced in the background. Uses AI credits. Needs the ai scope.',
      inputSchema: z.object({ workspace_id: workspaceId, id: z.string().uuid() }),
      async execute(input) {
        return client.request(
          'POST',
          `/v1/blog/articles/${input.id}/regenerate`,
          {},
          workspaceQuery(input.workspace_id),
        );
      },
    },

    {
      name: 'blog_submit_article',
      description:
        'Submit a draft, failed or rejected article for approval, moving it to in_review. Only an article in review can be published or scheduled. Any other status answers 409. Needs the posts scope.',
      inputSchema: z.object({ workspace_id: workspaceId, id: z.string().uuid() }),
      async execute(input) {
        return client.request(
          'POST',
          `/v1/blog/articles/${input.id}/submit`,
          {},
          workspaceQuery(input.workspace_id),
        );
      },
    },

    {
      name: 'blog_publish_article',
      description:
        'Approve an article in review and publish it now to the target in the blog settings: the product blog, a connected account, or your website. This goes live and cannot be recalled from here; only call it when the user has asked for this article to be published. A draft answers 409 until blog_submit_article; no target answers 409 no_target. Needs the publish scope.',
      inputSchema: z.object({ workspace_id: workspaceId, id: z.string().uuid() }),
      async execute(input) {
        return client.request(
          'POST',
          `/v1/blog/articles/${input.id}/publish`,
          {},
          workspaceQuery(input.workspace_id),
        );
      },
    },

    {
      name: 'blog_reject_article',
      description:
        'Reject a draft or an article in review so it is never published and leaves the review queue. The article is kept and can still be read. Needs the posts scope.',
      inputSchema: z.object({ workspace_id: workspaceId, id: z.string().uuid() }),
      async execute(input) {
        return client.request(
          'POST',
          `/v1/blog/articles/${input.id}/reject`,
          {},
          workspaceQuery(input.workspace_id),
        );
      },
    },

    {
      name: 'blog_delete_article',
      description:
        'Permanently delete an article from FoPost. A copy already on the website stays there. Needs the posts scope.',
      inputSchema: z.object({ workspace_id: workspaceId, id: z.string().uuid() }),
      async execute(input) {
        return client.request(
          'DELETE',
          `/v1/blog/articles/${input.id}`,
          undefined,
          workspaceQuery(input.workspace_id),
        );
      },
    },
  ];
}
