import { z } from 'zod';
import type { OwlStackClient } from '../client.js';
import type { ToolDefinition } from '../types.js';

const PLATFORM_ENUM = z.enum([
  'twitter',
  'linkedin',
  'facebook',
  'instagram',
  'telegram',
  'discord',
  'slack',
  'reddit',
  'pinterest',
  'tumblr',
  'dribbble',
  'mewe',
  'tiktok',
  'youtube',
  'bluesky',
  'threads',
  'mastodon',
  'devto',
  'medium',
  'kick',
]);

export function aiTools(client: OwlStackClient): ToolDefinition[] {
  return [
    {
      name: 'generate_caption',
      description:
        'Generate or improve a social media caption with AI. Optionally pass current draft text and target platforms for tone-aware output. Costs 1 AI credit.',
      inputSchema: z.object({
        current_caption: z.string().optional(),
        platforms: z.array(PLATFORM_ENUM).optional(),
        char_limit: z.number().int().optional(),
        workspace_id: z.string().uuid().optional(),
      }),
      async execute(input) {
        return client.post('/api/v1/ai/generate-caption', input);
      },
    },

    {
      name: 'rewrite_for_platforms',
      description:
        'Rewrite a piece of content for one or more target platforms, applying platform-specific tone and length constraints. Costs 1 AI credit per platform.',
      inputSchema: z.object({
        content: z.string(),
        platforms: z.array(PLATFORM_ENUM).min(1),
        tone: z.string().optional().describe('Optional user-defined tone override'),
        workspace_id: z.string().uuid().optional(),
      }),
      async execute(input) {
        return client.post('/api/v1/ai/rewrite', input);
      },
    },

    {
      name: 'repurpose_url',
      description:
        'Fetch a blog/article URL and generate one optimized post per requested platform in a single call. The flagship "Developer Content Stack" feature — write once, get 16 versions. Costs 6 AI credits per call regardless of platform count.',
      inputSchema: z.object({
        url: z.string().url(),
        platforms: z.array(PLATFORM_ENUM).min(1),
        workspace_id: z.string().uuid().optional(),
      }),
      async execute(input) {
        return client.post('/api/v1/ai/repurpose-url', input);
      },
    },

    {
      name: 'get_ai_credits',
      description: 'Show the current AI credit balance, usage this period, and reset date.',
      inputSchema: z.object({}),
      async execute() {
        return client.get('/api/v1/ai/credits');
      },
    },
  ];
}
