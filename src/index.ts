#!/usr/bin/env node
/**
 * @fopost/mcp — MCP server that exposes the FoPost REST API as MCP
 * tools so users can manage social media posts, accounts, AI usage,
 * the inbox, contacts, broadcasts, ads, the blog, and the articles
 * and products on a connected site
 * from any MCP-aware client (Claude Desktop, Cursor, ChatGPT, etc.).
 *
 * Configuration via environment variables:
 *   FOPOST_API_KEY  (required) — API key with appropriate scopes
 *   FOPOST_API_URL  (optional) — defaults to https://api.fopost.com
 *
 * Transport: stdio (standard for MCP servers).
 */

import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { ConfigError, createServer, readConfig } from './server.js';

async function main() {
  let config;
  try {
    config = readConfig(process.env);
  } catch (err) {
    if (!(err instanceof ConfigError)) throw err;
    console.error(`[fopost-mcp] ${err.message}`);
    process.exit(1);
  }

  const server = createServer(config, __PKG_VERSION__);
  await server.connect(new StdioServerTransport());
  console.error('[fopost-mcp] Server running on stdio');
}

main().catch((err) => {
  // Only the message: a stack or error object can carry request details.
  console.error('[fopost-mcp] Fatal:', err instanceof Error ? err.message : String(err));
  process.exit(1);
});
