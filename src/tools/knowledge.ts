import { z } from 'zod';
import type { FoPostClient } from '../client.js';
import type { ToolDefinition } from '../types.js';

const SOURCE_KIND = z.enum(['faq', 'text', 'url', 'file']);

/**
 * The workspace knowledge base — what the workspace has told FoPost about
 * itself. Searching it is what lets a drafted reply quote the brand's own
 * answer instead of inventing one, so `search_knowledge` is the tool to reach
 * for before stating a fact about the business.
 */
export function knowledgeTools(client: FoPostClient): ToolDefinition[] {
  return [
    {
      name: 'search_knowledge',
      description:
        "Search the workspace's own saved answers, pages and files for passages that answer a question. Use it before drafting a reply that states a fact about the business (prices, policies, hours, how something works). Returns nothing when the knowledge base has no answer; say so rather than filling the gap. Needs the inbox scope.",
      inputSchema: z.object({
        q: z.string().describe('The question, in plain words'),
        top_k: z.number().int().min(1).max(20).optional().describe('How many passages, default 5'),
        brand_voice_id: z.string().uuid().optional().describe('Narrow to one brand'),
        workspace_id: z.string().uuid().optional(),
      }),
      async execute(input) {
        return client.get('/v1/knowledge/search', input);
      },
    },

    {
      name: 'list_knowledge_sources',
      description:
        'List the workspace knowledge sources with their sync status. Only a source marked ready is searched. Needs the inbox scope.',
      inputSchema: z.object({
        workspace_id: z.string().uuid().optional(),
      }),
      async execute(input) {
        return client.get('/v1/knowledge/sources', input);
      },
    },

    {
      name: 'create_knowledge_source',
      description:
        'Add a knowledge source and queue it for indexing, so it comes back pending. An faq or text source needs content, a url source needs url, and a file source needs media_id pointing at a plain-text or CSV media item in the same workspace. Needs the inbox scope.',
      inputSchema: z.object({
        kind: SOURCE_KIND,
        title: z.string(),
        content: z.string().optional().describe('For an faq or text source'),
        url: z.string().url().optional().describe('For a url source: a page on your own site'),
        media_id: z.string().uuid().optional().describe('For a file source'),
        brand_voice_id: z.string().uuid().optional(),
        workspace_id: z.string().uuid().optional(),
      }),
      async execute(input) {
        return client.post('/v1/knowledge/sources', input);
      },
    },

    {
      name: 'update_knowledge_source',
      description:
        'Edit a knowledge source. Changing its content or its URL returns it to pending and re-indexes it. Needs the inbox scope.',
      inputSchema: z.object({
        id: z.string().uuid(),
        title: z.string().optional(),
        content: z.string().optional(),
        url: z.string().url().optional(),
        brand_voice_id: z.string().uuid().nullable().optional(),
      }),
      async execute({ id, ...body }) {
        return client.patch(`/v1/knowledge/sources/${id}`, body);
      },
    },

    {
      name: 'sync_knowledge_source',
      description:
        'Read a knowledge source again — a url source is re-fetched. Returns once the re-index is queued, not once it has finished. Needs the inbox scope.',
      inputSchema: z.object({
        id: z.string().uuid(),
      }),
      async execute({ id }) {
        return client.post(`/v1/knowledge/sources/${id}/sync`);
      },
    },

    {
      name: 'delete_knowledge_source',
      description:
        'Delete a knowledge source and every passage indexed from it. Needs the inbox scope.',
      inputSchema: z.object({
        id: z.string().uuid(),
      }),
      async execute({ id }) {
        return client.delete(`/v1/knowledge/sources/${id}`);
      },
    },
  ];
}
