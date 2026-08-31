# @fopost/mcp

MCP server for [FoPost](https://fopost.com): manage social media posts, accounts, and AI usage from any MCP-aware client (Claude Desktop, Cursor, ChatGPT desktop, Continue, etc.).

Runs via `npx -y @fopost/mcp`, no install step. Requires Node 18 or newer.

> **0.x release.** Tool names and arguments may still change between minor
> versions. Pin an exact version if that matters to you.

## Tools

| Tool                    | What it does                                                |
| ----------------------- | ----------------------------------------------------------- |
| `list_posts`            | List posts in a workspace, filter by status                 |
| `get_post`              | Fetch a post by id                                          |
| `schedule_post`         | Create a post (draft, scheduled, or publish-now)            |
| `edit_post`             | Update an existing post                                     |
| `cancel_post`           | Cancel a scheduled post                                     |
| `delete_post`           | Permanently delete a post                                   |
| `list_post_deliveries`  | Per-account delivery status for a post                      |
| `list_accounts`         | List connected social accounts                              |
| `get_account_health`    | Check token freshness and rate-limit headroom               |
| `list_workspaces`       | List workspaces the user can access                         |
| `generate_caption`      | AI-generate or improve a caption (1 credit)                 |
| `rewrite_for_platforms` | Rewrite content per target platform (1 credit each)         |
| `repurpose_url`         | Turn a blog URL into N platform-optimized posts (6 credits) |
| `get_ai_credits`        | Show current AI credit balance                              |

## Setup

### 1. Get an API key

Generate one at <https://fopost.com/dashboard/api-keys> with the scopes you need (`posts`, `accounts`, `workspaces` are most common).

### 2. Add to your MCP client

#### Claude Desktop

Edit `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) or `%APPDATA%\Claude\claude_desktop_config.json` (Windows):

```json
{
  "mcpServers": {
    "fopost": {
      "command": "npx",
      "args": ["-y", "@fopost/mcp"],
      "env": {
        "FOPOST_API_KEY": "your-api-key"
      }
    }
  }
}
```

#### Cursor / Continue / Other

Use the same `npx -y @fopost/mcp` command with `FOPOST_API_KEY` in the environment.

## Configuration

| Variable         | Required | Default                  |
| ---------------- | -------- | ------------------------ |
| `FOPOST_API_KEY` | yes      | required                 |
| `FOPOST_API_URL` | no       | `https://api.fopost.com` |

Self-hosted? Point `FOPOST_API_URL` at your instance.

## Example prompts

> "List my failed posts from this week and tell me which accounts are unhealthy."

> "Take this URL and turn it into a Twitter thread, a LinkedIn post, and a dev.to summary: https://example.com/blog/post"

> "How many AI credits do I have left this period?"

## Contributing

Issues and pull requests are welcome at
[fopost/fopost-mcp](https://github.com/fopost/fopost-mcp).

```bash
npm install
npm run lint     # tsc --noEmit
npm run build    # tsup -> dist/
```

## License

MIT
