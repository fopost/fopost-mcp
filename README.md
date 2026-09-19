# @fopost/mcp

MCP server for [FoPost](https://fopost.com): manage social media posts, accounts, AI usage, the inbox, and ads from any MCP-aware client (Claude Desktop, Cursor, ChatGPT desktop, Continue, etc.).

Runs via `npx -y @fopost/mcp`, no install step. Requires Node 18 or newer.

> **0.x release.** Tool names and arguments may still change between minor
> versions. Pin an exact version if that matters to you.

## Tools

| Tool                        | What it does                                                |
| --------------------------- | ----------------------------------------------------------- |
| `list_posts`                | List posts in a workspace, filter by status                 |
| `get_post`                  | Fetch a post by id                                          |
| `schedule_post`             | Create a post for accounts or an account group              |
| `edit_post`                 | Update an existing post                                     |
| `cancel_post`               | Cancel a scheduled post                                     |
| `delete_post`               | Permanently delete a post                                   |
| `list_post_deliveries`      | Per-account delivery status for a post                      |
| `list_accounts`             | List connected social accounts, optionally by group         |
| `get_account_health`        | Check token freshness and rate-limit headroom               |
| `list_workspaces`           | List workspaces the user can access                         |
| `rename_account`            | Set or clear an account's display name                      |
| `list_account_groups`       | List account groups and their members                       |
| `get_account_group`         | Fetch an account group                                      |
| `create_account_group`      | Create an account group                                     |
| `rename_account_group`      | Rename an account group                                     |
| `set_account_group_members` | Replace the accounts in a group                             |
| `delete_account_group`      | Delete a group (its accounts stay connected)                |
| `generate_caption`          | AI-generate or improve a caption (1 credit)                 |
| `rewrite_for_platforms`     | Rewrite content per target platform (1 credit each)         |
| `repurpose_url`             | Turn a blog URL into N platform-optimized posts (6 credits) |
| `get_ai_credits`            | Show current AI credit balance                              |
| `list_inbox`                | List comments, mentions and DMs with filters                |
| `list_inbox_threads`        | List comment threads under your posts, or mentions          |
| `list_inbox_conversations`  | List DM conversations                                       |
| `get_inbox_unread_count`    | Count unread inbox items                                    |
| `mark_inbox_thread_read`    | Mark a comment thread or DM conversation read               |
| `reply_to_inbox_item`       | Reply on the platform, with media or quick replies on a DM  |
| `edit_inbox_comment`        | Edit your own comment on the platform                       |
| `update_inbox_item`         | Set an item to unread, read, resolved or snoozed            |
| `hide_inbox_item`           | Hide a comment on the platform                              |
| `unhide_inbox_item`         | Unhide a comment on the platform                            |
| `delete_inbox_item`         | Delete a comment, or your own reply, on the platform        |
| `like_inbox_item`           | Like a comment or message on the platform                   |
| `unlike_inbox_item`         | Remove your like                                            |
| `pin_inbox_item`            | Pin your own comment                                        |
| `unpin_inbox_item`          | Unpin your own comment                                      |
| `react_to_inbox_item`       | React to a DM, or remove your reaction                      |
| `start_inbox_conversation`  | Send a new DM, or answer a comment privately                |
| `set_inbox_typing`          | Show or clear the typing indicator in a DM                  |
| `list_inbox_approvals`      | List drafted replies waiting for approval                   |
| `approve_inbox_reply`       | Approve and send a drafted reply                            |
| `reject_inbox_reply`        | Reject a drafted reply                                      |
| `refresh_inbox`             | Poll every inbox-capable account now                        |
| `list_ads`                  | List boosts and ads created through FoPost                  |
| `list_external_ads`         | List ads on connected ad accounts made elsewhere            |
| `list_boostable_posts`      | List published posts that can be boosted                    |
| `list_ad_sources`           | List ad connections, ad accounts and pages                  |
| `boost_post`                | Boost a published post (starts paused, needs `publish`)     |
| `create_ad`                 | Create an ad (starts paused, needs `publish`)               |
| `set_ad_status`             | Pause or resume an ad (needs `publish`)                     |
| `refresh_ad`                | Re-read delivery status and insights                        |
| `delete_ad`                 | End delivery and delete an ad (needs `publish`)             |
| `list_audiences`            | List saved audiences and pixels on an ad account            |
| `search_ad_targeting`       | Search locations, interests, behaviors and income brackets  |
| `list_lead_forms`           | List lead forms on connected pages                          |
| `list_leads`                | List one page of leads from a lead form                     |

## Setup

### 1. Get an API key

Generate one at <https://fopost.com/dashboard/api-keys> with the scopes you need (`posts`, `publish`, `accounts`, `workspaces` are most common; `publish` is required to publish, retry or cancel a post). Inbox tools need `inbox`, and liking, pinning, reacting, editing, starting a conversation, the typing indicator, reply media and quick replies, and deleting your own reply also need `publish`; ads tools need `ads`, and `boost_post`, `create_ad`, `set_ad_status` and `delete_ad` also need `publish`. A boost or ad starts paused unless `paused` is `false`.

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
