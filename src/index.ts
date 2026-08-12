#!/usr/bin/env node
/**
 * @owlstackapp/mcp — MCP server that exposes the OwlStack REST API as MCP
 * tools so users can manage social media posts, accounts, and AI usage
 * from any MCP-aware client (Claude Desktop, Cursor, ChatGPT, etc.).
 *
 * Configuration via environment variables:
 *   OWLSTACK_API_KEY  (required) — API key with appropriate scopes
 *   OWLSTACK_API_URL  (optional) — defaults to https://api.owlstack.app
 *
 * Transport: stdio (standard for MCP servers).
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { OwlStackClient, OwlStackApiError } from './client.js';
import { postsTools } from './tools/posts.js';
import { accountsTools } from './tools/accounts.js';
import { aiTools } from './tools/ai.js';
import type { ToolDefinition } from './types.js';

const DEFAULT_API_URL = 'https://api.owlstack.app';

function readConfig(): { apiKey: string; baseUrl: string } {
  const apiKey = process.env.OWLSTACK_API_KEY;
  if (!apiKey) {
    console.error(
      '[owlstack-mcp] Missing OWLSTACK_API_KEY. Generate one at https://app.owlstack.app/api-keys',
    );
    process.exit(1);
  }
  return {
    apiKey,
    baseUrl: process.env.OWLSTACK_API_URL ?? DEFAULT_API_URL,
  };
}

async function main() {
  const config = readConfig();
  const client = new OwlStackClient(config);

  const allTools: ToolDefinition[] = [
    ...postsTools(client),
    ...accountsTools(client),
    ...aiTools(client),
  ];
  const toolMap = new Map(allTools.map((t) => [t.name, t]));

  const server = new Server(
    {
      name: 'owlstack-mcp',
      version: __PKG_VERSION__,
    },
    {
      capabilities: {
        tools: {},
      },
    },
  );

  // ─── List tools ─────────────────────────────────────────────────
  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: allTools.map((t) => ({
      name: t.name,
      description: t.description,
      inputSchema: zodToJsonSchema(t.inputSchema, { target: 'jsonSchema7' }),
    })),
  }));

  // ─── Call tool ──────────────────────────────────────────────────
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    const tool = toolMap.get(name);
    if (!tool) {
      return {
        isError: true,
        content: [{ type: 'text', text: `Unknown tool: ${name}` }],
      };
    }

    const parsed = tool.inputSchema.safeParse(args ?? {});
    if (!parsed.success) {
      return {
        isError: true,
        content: [
          {
            type: 'text',
            text: `Invalid arguments for ${name}: ${parsed.error.message}`,
          },
        ],
      };
    }

    try {
      const result = await tool.execute(parsed.data);
      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      };
    } catch (err) {
      if (err instanceof OwlStackApiError) {
        return {
          isError: true,
          content: [
            {
              type: 'text',
              text: `OwlStack API ${err.status}${err.code ? ` (${err.code})` : ''}: ${err.message}`,
            },
          ],
        };
      }
      return {
        isError: true,
        content: [
          {
            type: 'text',
            text: err instanceof Error ? err.message : 'Unknown error',
          },
        ],
      };
    }
  });

  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('[owlstack-mcp] Server running on stdio');
}

main().catch((err) => {
  console.error('[owlstack-mcp] Fatal:', err);
  process.exit(1);
});
