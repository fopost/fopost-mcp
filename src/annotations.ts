/**
 * MCP tool annotations, derived from the tool name's verb. Clients use them to
 * decide what runs without asking: reads can be allowed, anything that deletes,
 * overwrites, spends, or puts content in front of other people should be confirmed
 * by the user. A model can be talked into any call, so that confirmation belongs
 * to the client, not to an argument the model fills in.
 */

export type ToolAnnotations = {
  readOnlyHint: boolean;
  destructiveHint: boolean;
  openWorldHint: boolean;
};

const READ_VERBS = new Set([
  'list',
  'get',
  'search',
  'read',
  'lookup',
  'preview',
  'estimate',
  'validate',
]);

const READ_TOOLS = new Set(['run_google_ads_query', 'google_keyword_ideas']);

/**
 * Writes that only add drafts or bookkeeping inside the workspace. Every other
 * write is destructive, the spec's default: it may overwrite, spend, publish,
 * message someone, or send data to a network or a webhook.
 */
const ADDITIVE_VERBS = new Set([
  'generate',
  'rewrite',
  'repurpose',
  'suggest',
  'plan',
  'regenerate',
  'mark',
  'bookmark',
  'unbookmark',
  'refresh',
  'sync',
  'collect',
]);

function verbOf(name: string): string {
  const bare = name.startsWith('blog_') ? name.slice('blog_'.length) : name;
  return bare.split('_')[0];
}

export function toolAnnotations(name: string): ToolAnnotations {
  const verb = verbOf(name);
  const readOnly = READ_TOOLS.has(name) || READ_VERBS.has(verb);
  return {
    readOnlyHint: readOnly,
    destructiveHint: !readOnly && !ADDITIVE_VERBS.has(verb),
    // Every tool reaches the FoPost API, and most reach a social network behind it.
    openWorldHint: true,
  };
}
