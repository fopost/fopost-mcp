import { z } from 'zod';
import type { FoPostClient } from '../client.js';
import type { ToolDefinition } from '../types.js';

/**
 * Deeper posting analytics, derived from the repeated readings the platform
 * collector takes of every post as it ages. Every tool needs the `analytics`
 * scope on the API key.
 */
export function analyticsTools(client: FoPostClient): ToolDefinition[] {
  return [
    {
      name: 'get_content_decay',
      description:
        "How long a post keeps earning. Engagement is grouped by the post's age at the moment each reading was taken, so every band reports where the average post had got to by then and what share of everything it eventually earned that was. half_life_bucket names the first band past half. Use it to argue about posting times. `days` selects posts by publish time, not reading time.",
      inputSchema: z.object({
        workspace_id: z.string().uuid().optional(),
        account_id: z.string().uuid().optional().describe('Narrow to one connected account'),
        days: z
          .number()
          .int()
          .min(1)
          .max(365)
          .optional()
          .describe('Only posts published in the last this many days, default 30'),
      }),
      async execute(input) {
        return client.get('/v1/analytics/decay', {
          workspace_id: input.workspace_id,
          accountId: input.account_id,
          days: input.days,
        });
      },
    },

    {
      name: 'get_posting_frequency',
      description:
        'Whether posting more earned more. Weeks run Monday to Sunday in UTC and are grouped into cadence bands by their own post count, so a four-post week is compared against other four-post weeks rather than the average. `best` names the cadence that earned the most per post. A week with no posts belongs to no band.',
      inputSchema: z.object({
        workspace_id: z.string().uuid().optional(),
        account_id: z.string().uuid().optional().describe('Narrow to one connected account'),
        days: z
          .number()
          .int()
          .min(7)
          .max(365)
          .optional()
          .describe('How far back to look, default 90'),
      }),
      async execute(input) {
        return client.get('/v1/analytics/frequency', {
          workspace_id: input.workspace_id,
          accountId: input.account_id,
          days: input.days,
        });
      },
    },

    {
      name: 'get_post_timeline',
      description:
        'Every metric reading held for one post, oldest first, each carrying what moved since the reading before it, with one timeline per delivery because the same post on two networks decays differently. Use it to see whether a post is still climbing or has stopped.',
      inputSchema: z.object({
        post: z
          .string()
          .min(1)
          .describe('A FoPost post id, or the permalink of a post made natively on the network'),
      }),
      async execute(input) {
        return client.get(`/v1/analytics/posts/${encodeURIComponent(input.post)}/timeline`);
      },
    },

    {
      name: 'get_analytics_changes',
      description:
        'Metric readings recorded after a timestamp, oldest first, with a cursor to pass as the next `since`. This is how an external store mirrors the metrics without refetching the whole history. Omitting `since` gives the last seven days.',
      inputSchema: z.object({
        since: z
          .string()
          .optional()
          .describe('ISO 8601 instant; return readings recorded after it'),
        limit: z.number().int().min(1).max(500).optional(),
        workspace_id: z.string().uuid().optional(),
        account_id: z.string().uuid().optional(),
      }),
      async execute(input) {
        return client.get('/v1/analytics/changes', {
          since: input.since,
          limit: input.limit,
          workspace_id: input.workspace_id,
          accountId: input.account_id,
        });
      },
    },

    {
      name: 'collect_post_analytics',
      description:
        "Re-read one post's metrics from the network now, instead of waiting for the next scheduled collection. One post is still a platform call, so it spends the same per-user budget as a full collection run and answers 429 with retryAfter when that runs out. Do not put it in a loop.",
      inputSchema: z.object({
        post: z
          .string()
          .min(1)
          .describe('A FoPost post id, or the permalink of a post made natively on the network'),
      }),
      async execute(input) {
        return client.post(`/v1/posts/${encodeURIComponent(input.post)}/analytics/collect`);
      },
    },

    {
      name: 'list_native_posts',
      description:
        'Posts that exist on a connected account but never went out through FoPost, newest first, with the freshest metrics held for each. Use it to reconcile an account you started managing partway through, or to see what a client posted by hand.',
      inputSchema: z.object({
        account_id: z.string().uuid(),
        page: z.number().int().min(1).optional(),
        per_page: z.number().int().min(1).max(100).optional(),
        days: z
          .number()
          .int()
          .min(1)
          .max(365)
          .optional()
          .describe('Only posts published in the last this many days'),
      }),
      async execute(input) {
        return client.get(`/v1/accounts/${input.account_id}/native-posts`, {
          page: input.page,
          per_page: input.per_page,
          days: input.days,
        });
      },
    },
  ];
}
