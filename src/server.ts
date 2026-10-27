import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { FoPostClient, FoPostApiError } from './client.js';
import { postsTools } from './tools/posts.js';
import { accountsTools } from './tools/accounts.js';
import { aiTools } from './tools/ai.js';
import { inboxTools } from './tools/inbox.js';
import { contactsTools } from './tools/contacts.js';
import { broadcastsTools } from './tools/broadcasts.js';
import { adsTools } from './tools/ads.js';
import { analyticsTools } from './tools/analytics.js';
import { knowledgeTools } from './tools/knowledge.js';
import { activityTools } from './tools/activity.js';
import { googleBusinessTools } from './tools/google-business.js';
import { googleAdsTools } from './tools/ads-google.js';
import { blogTools } from './tools/blog.js';
import { whatsappTools } from './tools/whatsapp.js';
import { blogsTools } from './tools/blogs.js';
import { connectSessionsTools } from './tools/connect-sessions.js';
import { webhooksTools } from './tools/webhooks.js';
import { queueTools } from './tools/queue.js';
import { automationsTools } from './tools/automations.js';
import { toolAnnotations } from './annotations.js';
import type { ToolDefinition } from './types.js';

export const DEFAULT_API_URL = 'https://api.fopost.com';

/** Destructive calls allowed per rolling minute before the server pushes back. */
export const DESTRUCTIVE_CALLS_PER_MINUTE = 30;

/** Longest error text handed back to the model; a proxy's HTML error page can be huge. */
const MAX_ERROR_CHARS = 2000;

export type Config = { apiKey: string; baseUrl: string };

export class ConfigError extends Error {}

const LOOPBACK = new Set(['localhost', '127.0.0.1', '[::1]']);

export function readConfig(env: Record<string, string | undefined>): Config {
  const apiKey = env.FOPOST_API_KEY?.trim();
  if (!apiKey) {
    throw new ConfigError(
      'Missing FOPOST_API_KEY. Generate one at https://fopost.com/dashboard/api-keys',
    );
  }

  const raw = env.FOPOST_API_URL ?? DEFAULT_API_URL;
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new ConfigError(`FOPOST_API_URL is not a URL: ${raw}`);
  }
  // The key rides on every request, so it never goes out in clear text off this machine.
  if (url.protocol !== 'https:' && !(url.protocol === 'http:' && LOOPBACK.has(url.hostname))) {
    throw new ConfigError('FOPOST_API_URL must use https (http is allowed for localhost only)');
  }
  if (url.username || url.password || url.search || url.hash || url.pathname !== '/') {
    throw new ConfigError('FOPOST_API_URL must be a bare host, e.g. https://api.fopost.com');
  }
  return { apiKey, baseUrl: url.origin };
}

export function buildTools(client: FoPostClient): ToolDefinition[] {
  return [
    ...postsTools(client),
    ...accountsTools(client),
    ...aiTools(client),
    ...inboxTools(client),
    ...contactsTools(client),
    ...broadcastsTools(client),
    ...adsTools(client),
    ...analyticsTools(client),
    ...knowledgeTools(client),
    ...activityTools(client),
    ...googleBusinessTools(client),
    ...googleAdsTools(client),
    ...blogTools(client),
    ...whatsappTools(client),
    ...blogsTools(client),
    ...connectSessionsTools(client),
    ...webhooksTools(client),
    ...queueTools(client),
    ...automationsTools(client),
  ];
}

export function listTools(tools: ToolDefinition[]) {
  return tools.map((t) => ({
    name: t.name,
    description: t.description,
    inputSchema: zodToJsonSchema(t.inputSchema, { target: 'jsonSchema7' }),
    annotations: toolAnnotations(t.name),
  }));
}

export type ToolResult = { isError?: boolean; content: { type: 'text'; text: string }[] };

const fail = (text: string): ToolResult => ({ isError: true, content: [{ type: 'text', text }] });

/** Keeps the key out of anything the model reads, even when an upstream error echoes it. */
export function redact(text: string, secret: string): string {
  // A real key is long; redacting a placeholder like "x" would garble every message.
  const clean = secret.length >= 8 ? text.split(secret).join('[redacted]') : text;
  return clean.length > MAX_ERROR_CHARS ? `${clean.slice(0, MAX_ERROR_CHARS)}…` : clean;
}

function apiErrorText(err: FoPostApiError): string {
  const base = `FoPost API ${err.status}${err.code ? ` (${err.code})` : ''}: ${err.message}`;
  if (err.status === 401) return `${base}. The API key was rejected; check FOPOST_API_KEY.`;
  if (err.status === 403) return `${base}. The API key lacks the scope or workspace for this.`;
  if (err.status === 429) {
    return `${base}. Rate limited${err.retryAfter ? `; retry after ${err.retryAfter}s` : ''}.`;
  }
  return base;
}

export function createToolCaller(
  tools: ToolDefinition[],
  opts: { apiKey: string; now?: () => number; destructivePerMinute?: number },
) {
  const toolMap = new Map(tools.map((t) => [t.name, t]));
  const now = opts.now ?? Date.now;
  const limit = opts.destructivePerMinute ?? DESTRUCTIVE_CALLS_PER_MINUTE;
  let recent: number[] = [];

  return async (name: string, args: unknown): Promise<ToolResult> => {
    const tool = toolMap.get(name);
    if (!tool) return fail(`Unknown tool: ${redact(name, opts.apiKey)}`);

    const parsed = tool.inputSchema.safeParse(args ?? {});
    if (!parsed.success) {
      return fail(redact(`Invalid arguments for ${name}: ${parsed.error.message}`, opts.apiKey));
    }

    // A looping or hijacked agent should not get to delete or send in bulk unchecked.
    if (toolAnnotations(name).destructiveHint) {
      const t = now();
      recent = recent.filter((at) => t - at < 60_000);
      if (recent.length >= limit) {
        const wait = Math.ceil((recent[0] + 60_000 - t) / 1000);
        return fail(
          `Too many destructive calls: ${limit} in the last minute. Check with the user before continuing; retry in ${wait}s.`,
        );
      }
      recent.push(t);
    }

    try {
      const result = await tool.execute(parsed.data);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    } catch (err) {
      if (err instanceof FoPostApiError) return fail(redact(apiErrorText(err), opts.apiKey));
      return fail(redact(err instanceof Error ? err.message : 'Unknown error', opts.apiKey));
    }
  };
}

export function createServer(config: Config, version: string): Server {
  const tools = buildTools(new FoPostClient(config));
  const call = createToolCaller(tools, { apiKey: config.apiKey });
  const server = new Server({ name: 'fopost-mcp', version }, { capabilities: { tools: {} } });
  const listed = listTools(tools);
  server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: listed }));
  server.setRequestHandler(CallToolRequestSchema, async (request) =>
    call(request.params.name, request.params.arguments),
  );
  return server;
}
