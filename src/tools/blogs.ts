import { z } from 'zod';
import type { FoPostClient } from '../client.js';
import type { ToolDefinition } from '../types.js';

/**
 * Content a connected site already owns: the articles on a WordPress site or a
 * Shopify store's blog, and a Shopify store's products.
 *
 * Every id these tools take is the platform's own, not a FoPost id, so the
 * descriptions say where to get each one. Reads need the `posts` scope; the
 * writes need `publish` too, because a change here is visible to the site's
 * own readers.
 */
export function blogsTools(client: FoPostClient): ToolDefinition[] {
  return [
    {
      name: 'list_blogs',
      description:
        "List the blogs a connected account can write to. A Shopify store reports every blog it has; a WordPress site reports its one implicit blog under the id 'default'. Use the returned id as blog_id everywhere below. Accounts on a platform that cannot manage articles answer 400 unsupported_platform.",
      inputSchema: z.object({
        account_id: z.string().uuid().describe('A WordPress or Shopify account'),
      }),
      async execute(input) {
        return client.get(`/v1/accounts/${input.account_id}/blogs`);
      },
    },

    {
      name: 'list_articles',
      description:
        'List the articles already on a blog, newest first, drafts included, whether FoPost created them or the site owner wrote them. Use this before changing an article, to find its id.',
      inputSchema: z.object({
        account_id: z.string().uuid(),
        blog_id: z.string().describe("Blog id from list_blogs ('default' on WordPress)"),
        limit: z.number().int().min(1).max(50).optional().describe('Default 20'),
        status: z.enum(['published', 'draft', 'pending', 'scheduled']).optional(),
        q: z.string().max(200).optional().describe('Match the article title'),
      }),
      async execute(input) {
        return client.get(`/v1/accounts/${input.account_id}/blogs/${input.blog_id}/articles`, {
          limit: input.limit,
          status: input.status,
          q: input.q,
        });
      },
    },

    {
      name: 'get_article',
      description: 'Fetch one article on a connected site in full, including its body.',
      inputSchema: z.object({
        account_id: z.string().uuid(),
        blog_id: z.string(),
        article_id: z.string().describe('The article id on the platform, from list_articles'),
      }),
      async execute(input) {
        return client.get(
          `/v1/accounts/${input.account_id}/blogs/${input.blog_id}/articles/${input.article_id}`,
        );
      },
    },

    {
      name: 'create_article',
      description:
        "Write a new article to a blog on a connected site. body is FoPost body markup and the site's own format is rendered from it. Defaults to a draft unless status says otherwise. Needs the publish scope.",
      inputSchema: z.object({
        account_id: z.string().uuid(),
        blog_id: z.string(),
        title: z.string().min(1).max(500),
        body: z.string().min(1),
        excerpt: z.string().max(5000).optional(),
        status: z.enum(['published', 'draft', 'pending', 'scheduled']).optional(),
        tags: z.array(z.string().max(100)).max(50).optional(),
        author_name: z.string().max(200).optional(),
        image_url: z.string().url().optional().describe('Public http(s) featured image'),
      }),
      async execute(input) {
        const { account_id: accountId, blog_id: blogId, ...body } = input;
        return client.post(`/v1/accounts/${accountId}/blogs/${blogId}/articles`, body);
      },
    },

    {
      name: 'update_article',
      description:
        'Change an article that is already live on a connected site. Only the fields you pass are touched and the article is addressed by its own id, so this edits the live post in place and never creates a duplicate. Pass at least one field. Needs the publish scope.',
      inputSchema: z.object({
        account_id: z.string().uuid(),
        blog_id: z.string(),
        article_id: z.string(),
        title: z.string().min(1).max(500).optional(),
        body: z.string().optional(),
        excerpt: z.string().max(5000).optional(),
        status: z.enum(['published', 'draft', 'pending', 'scheduled']).optional(),
        tags: z.array(z.string().max(100)).max(50).optional(),
        author_name: z.string().max(200).optional(),
        image_url: z.string().url().optional(),
      }),
      async execute(input) {
        const { account_id: accountId, blog_id: blogId, article_id: articleId, ...body } = input;
        return client.request(
          'PATCH',
          `/v1/accounts/${accountId}/blogs/${blogId}/articles/${articleId}`,
          body,
        );
      },
    },

    {
      name: 'delete_article',
      description:
        'Remove an article from a connected site permanently. This cannot be undone. Needs the publish scope.',
      inputSchema: z.object({
        account_id: z.string().uuid(),
        blog_id: z.string(),
        article_id: z.string(),
      }),
      async execute(input) {
        return client.request(
          'DELETE',
          `/v1/accounts/${input.account_id}/blogs/${input.blog_id}/articles/${input.article_id}`,
        );
      },
    },

    {
      name: 'list_products',
      description:
        "List a connected store's products with their status, price, vendor, type and tags. Shopify only; other platforms answer 400 unsupported_platform.",
      inputSchema: z.object({
        account_id: z.string().uuid(),
        limit: z.number().int().min(1).max(50).optional().describe('Default 20'),
        status: z.enum(['active', 'draft', 'archived']).optional(),
        q: z.string().max(200).optional().describe('Match the product title'),
      }),
      async execute(input) {
        return client.get(`/v1/accounts/${input.account_id}/products`, {
          limit: input.limit,
          status: input.status,
          q: input.q,
        });
      },
    },

    {
      name: 'update_product',
      description:
        'Change a product on a connected store. Only the fields you pass change. Pass at least one. Needs the publish scope.',
      inputSchema: z.object({
        account_id: z.string().uuid(),
        product_id: z.string().describe('The product id on the platform, from list_products'),
        title: z.string().min(1).max(500).optional(),
        description: z.string().optional(),
        status: z.enum(['active', 'draft', 'archived']).optional(),
        tags: z.array(z.string().max(100)).max(50).optional(),
        product_type: z.string().max(200).optional(),
        vendor: z.string().max(200).optional(),
      }),
      async execute(input) {
        const { account_id: accountId, product_id: productId, ...body } = input;
        return client.request('PATCH', `/v1/accounts/${accountId}/products/${productId}`, body);
      },
    },
  ];
}
