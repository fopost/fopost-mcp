# @fopost/mcp

MCP server for [FoPost](https://fopost.com): manage social media posts, accounts, AI usage, the inbox, contacts, broadcasts, and ads from any MCP-aware client (Claude Desktop, Cursor, ChatGPT desktop, Continue, etc.).

Runs via `npx -y @fopost/mcp`, no install step. Requires Node 18 or newer.

> **0.x release.** Tool names and arguments may still change between minor
> versions. Pin an exact version if that matters to you.

## Tools

| Tool                           | What it does                                                     |
| ------------------------------ | ---------------------------------------------------------------- |
| `list_posts`                   | List posts in a workspace, filter by status                      |
| `get_post`                     | Fetch a post by id                                               |
| `schedule_post`                | Create a post for accounts or an account group                   |
| `edit_post`                    | Update an existing post                                          |
| `cancel_post`                  | Cancel a scheduled post                                          |
| `delete_post`                  | Permanently delete a post                                        |
| `list_post_deliveries`         | Per-account delivery status for a post                           |
| `list_accounts`                | List connected social accounts, optionally by group              |
| `get_account_health`           | Check token freshness and rate-limit headroom                    |
| `list_workspaces`              | List workspaces the user can access                              |
| `rename_account`               | Set or clear an account's display name                           |
| `list_account_groups`          | List account groups and their members                            |
| `get_account_group`            | Fetch an account group                                           |
| `create_account_group`         | Create an account group                                          |
| `rename_account_group`         | Rename an account group                                          |
| `set_account_group_members`    | Replace the accounts in a group                                  |
| `delete_account_group`         | Delete a group (its accounts stay connected)                     |
| `create_telegram_connect_code` | Mint a one-time code to connect a Telegram chat                  |
| `get_telegram_connect_status`  | Check whether a Telegram connect code was used                   |
| `get_telegram_bot_commands`    | List the bot command menu in a Telegram chat                     |
| `set_telegram_bot_commands`    | Replace the bot command menu in a Telegram chat                  |
| `clear_telegram_bot_commands`  | Clear the bot command menu in a Telegram chat                    |
| `list_slack_channels`          | List the channels a Slack account can post to                    |
| `list_slack_members`           | List members of a Slack workspace, for DMs                       |
| `get_slack_identity`           | Show the name and icon a Slack account posts under               |
| `set_slack_identity`           | Set the name and icon a Slack account posts under                |
| `get_messaging_setting`        | Read a Meta ice breakers, persistent menu or greeting setting    |
| `set_ice_breakers`             | Replace the prompts shown before the first message               |
| `set_persistent_menu`          | Replace the always-visible Messenger menu                        |
| `set_greeting`                 | Replace the Messenger greeting                                   |
| `clear_messaging_setting`      | Clear one Meta messaging-profile setting                         |
| `get_webhook_subscription`     | Check what the network delivers to the FoPost webhook            |
| `resubscribe_webhook`          | Re-subscribe an account whose webhook lapsed                     |
| `list_discord_channels`        | List the channels a Discord bot account can post to              |
| `switch_discord_channel`       | Move a Discord account to another channel in the same server     |
| `get_discord_identity`         | Show the nickname and avatar the bot wears in the server         |
| `set_discord_identity`         | Set the nickname and avatar the bot wears in the server          |
| `list_discord_pins`            | List the pinned messages in the account's channel                |
| `manage_discord_message`       | Delete, pin, unpin, crosspost a message or start a thread on it  |
| `send_discord_dm`              | Send one direct message to a member of the server                |
| `list_discord_events`          | List the server's scheduled events                               |
| `create_discord_event`         | Add a scheduled event to the server                              |
| `update_discord_event`         | Change a scheduled event                                         |
| `delete_discord_event`         | Remove a scheduled event                                         |
| `list_discord_members`         | List or search the server's members                              |
| `list_discord_roles`           | List the server's roles                                          |
| `create_discord_role`          | Add a role to the server                                         |
| `assign_discord_role`          | Give a member a role, or take one away                           |
| `generate_caption`             | AI-generate or improve a caption (1 credit)                      |
| `rewrite_for_platforms`        | Rewrite content per target platform (1 credit each)              |
| `repurpose_url`                | Turn a blog URL into N platform-optimized posts (6 credits)      |
| `get_ai_credits`               | Show current AI credit balance                                   |
| `list_inbox`                   | List comments, mentions and DMs with filters                     |
| `list_inbox_threads`           | List comment threads under your posts, or mentions               |
| `list_inbox_conversations`     | List DM conversations                                            |
| `get_inbox_unread_count`       | Count unread inbox items                                         |
| `mark_inbox_thread_read`       | Mark a comment thread or DM conversation read                    |
| `reply_to_inbox_item`          | Reply on the platform, with media or quick replies on a DM       |
| `edit_inbox_comment`           | Edit your own comment on the platform                            |
| `update_inbox_item`            | Set an item to unread, read, resolved or snoozed                 |
| `hide_inbox_item`              | Hide a comment on the platform                                   |
| `unhide_inbox_item`            | Unhide a comment on the platform                                 |
| `delete_inbox_item`            | Delete a comment, or your own reply, on the platform             |
| `like_inbox_item`              | Like a comment or message on the platform                        |
| `unlike_inbox_item`            | Remove your like                                                 |
| `pin_inbox_item`               | Pin your own comment                                             |
| `unpin_inbox_item`             | Unpin your own comment                                           |
| `react_to_inbox_item`          | React to a DM, or remove your reaction                           |
| `start_inbox_conversation`     | Send a new DM, or answer a comment privately                     |
| `set_inbox_typing`             | Show or clear the typing indicator in a DM                       |
| `handover_conversation`        | Pass a Messenger thread to another Meta app, or take it back     |
| `list_inbox_approvals`         | List drafted replies waiting for approval                        |
| `approve_inbox_reply`          | Approve and send a drafted reply                                 |
| `reject_inbox_reply`           | Reject a drafted reply                                           |
| `refresh_inbox`                | Poll every inbox-capable account now                             |
| `list_contacts`                | List the people behind the inbox, most recently active first     |
| `get_contact`                  | Read one contact                                                 |
| `create_contact`               | File a person by hand; folds into whoever holds the handle       |
| `update_contact`               | Change a name, note, channels or custom fields                   |
| `delete_contact`               | Remove a contact; the messages stay in the inbox                 |
| `list_contact_conversations`   | The inbox threads one contact appears in                         |
| `import_contacts`              | Import from CSV text                                             |
| `list_contact_fields`          | The columns this workspace keeps about a contact                 |
| `create_contact_field`         | Add a column                                                     |
| `update_contact_field`         | Rename a field, change its options, or move it                   |
| `delete_contact_field`         | Remove a field and every answer to it                            |
| `get_conversation_analytics`   | Inbox volume and reply time per thread (needs `analytics`)       |
| `list_broadcasts`              | List broadcasts, newest first                                    |
| `get_broadcast`                | Read one broadcast                                               |
| `create_broadcast`             | Write one without sending it                                     |
| `update_broadcast`             | Edit a draft or scheduled broadcast                              |
| `send_broadcast`               | Send it; closed windows are skipped (needs `publish`)            |
| `cancel_broadcast`             | Stop it where it stands (needs `publish`)                        |
| `list_broadcast_recipients`    | Who it reached, who it skipped, and why                          |
| `delete_broadcast`             | Remove it; sent messages stay in their conversations             |
| `list_sequences`               | List drip sequences                                              |
| `get_sequence`                 | Read one sequence and its steps                                  |
| `create_sequence`              | Write one; creating it enrolls nobody                            |
| `update_sequence`              | Edit the steps, or pause and resume it                           |
| `enroll_in_sequence`           | Put contacts on it, by id or audience (needs `publish`)          |
| `unenroll_from_sequence`       | Take contacts off it (needs `publish`)                           |
| `list_sequence_enrollments`    | Who is on it and what step they are at                           |
| `delete_sequence`              | Remove it and every enrollment on it                             |
| `list_ads`                     | List boosts and ads created through FoPost                       |
| `list_external_ads`            | List ads on connected ad accounts made elsewhere                 |
| `list_boostable_posts`         | List published posts that can be boosted                         |
| `list_ad_sources`              | List ad connections, ad accounts and pages                       |
| `list_ad_goals`                | List the goals this connection can run right now                 |
| `list_ad_catalogs`             | List product catalogs the connection reaches                     |
| `create_ad_catalog`            | Create a product catalog (needs `publish`)                       |
| `list_catalog_products`        | List one page of a catalog's products                            |
| `write_catalog_products`       | Upsert or delete up to 500 products (needs `publish`)            |
| `list_catalog_product_sets`    | List the product sets a catalog ad can run from                  |
| `create_catalog_product_set`   | Create a product set (needs `publish`)                           |
| `list_reach_frequency`         | List reach-and-frequency predictions on an ad account            |
| `search_ad_library`            | Search the public ad archive, read live and never stored         |
| `list_ad_account_activity`     | Read an ad account's change log                                  |
| `boost_post`                   | Boost a published post (starts paused, needs `publish`)          |
| `create_ad`                    | Create an ad (starts paused, needs `publish`)                    |
| `set_ad_status`                | Pause or resume an ad (needs `publish`)                          |
| `refresh_ad`                   | Re-read delivery status and insights                             |
| `delete_ad`                    | End delivery and delete an ad (needs `publish`)                  |
| `list_audiences`               | List saved audiences and pixels on an ad account                 |
| `search_ad_targeting`          | Search locations, interests, behaviors and income brackets       |
| `list_lead_forms`              | List lead forms on connected pages                               |
| `list_leads`                   | List one page of leads from a lead form                          |
| `get_ad_account_tree`          | Read campaigns, ad sets and ads on an ad account                 |
| `create_ad_campaign`           | Create a campaign (starts paused, needs `publish`)               |
| `get_ad_campaign`              | Read one campaign                                                |
| `update_ad_campaign`           | Rename, pause or resume a campaign (needs `publish`)             |
| `delete_ad_campaign`           | Delete a campaign and its contents (needs `publish`)             |
| `duplicate_ad_campaign`        | Copy a campaign (starts paused, needs `publish`)                 |
| `create_ad_set`                | Create an ad set (starts paused, needs `publish`)                |
| `get_ad_set`                   | Read one ad set                                                  |
| `update_ad_set`                | Change an ad set's status, budget or targeting (needs `publish`) |
| `delete_ad_set`                | Delete an ad set and its ads (needs `publish`)                   |
| `duplicate_ad_set`             | Copy an ad set (starts paused, needs `publish`)                  |
| `create_network_ad`            | Create an ad inside an ad set (starts paused, needs `publish`)   |
| `get_network_ad`               | Read one ad inside an ad set                                     |
| `update_network_ad`            | Rename, pause, resume or swap an ad's creative (needs `publish`) |
| `delete_network_ad`            | Delete an ad inside an ad set (needs `publish`)                  |
| `duplicate_network_ad`         | Copy an ad (starts paused, needs `publish`)                      |
| `bulk_set_ad_status`           | Pause or resume up to 50 objects (needs `publish`)               |
| `list_ad_creatives`            | List creatives on an ad account                                  |
| `create_ad_creative`           | Create an image, video or carousel creative                      |
| `get_ad_creative`              | Read one creative                                                |
| `delete_ad_creative`           | Delete a creative                                                |
| `get_audience`                 | Read one saved audience                                          |
| `update_audience`              | Rename or redescribe a saved audience                            |
| `delete_audience`              | Delete a saved audience                                          |
| `add_audience_users`           | Add customer emails to a custom audience                         |
| `estimate_ad_reach`            | Estimate the reach of a targeting                                |
| `get_ad_object_insights`       | Insights for a campaign, ad set or ad                            |
| `get_ad_insights`              | Insights for an ad created through FoPost                        |
| `get_lead_form`                | Read one lead form                                               |
| `archive_lead_form`            | Archive a lead form                                              |
| `list_leads_feed`              | List stored leads from subscribed pages                          |
| `list_lead_pages`              | List pages subscribed to new leads                               |
| `subscribe_lead_page`          | Subscribe a page to new leads and backfill                       |
| `unsubscribe_lead_page`        | Unsubscribe a page from new leads                                |
| `search_knowledge`             | Find the saved passages that answer a question about the brand   |
| `list_knowledge_sources`       | List knowledge sources and their sync status                     |
| `create_knowledge_source`      | Save an FAQ, a note, one of your pages, or a text file           |
| `update_knowledge_source`      | Edit a source; changing its text re-indexes it                   |
| `sync_knowledge_source`        | Read a source again — a URL source is re-fetched                 |
| `delete_knowledge_source`      | Delete a source and its indexed passages                         |
| `list_activity`                | What happened in a workspace, newest first                       |
| `list_audit_events`            | The security audit log: who changed access, and when             |
| Tool                                    | What it does                                                     |
| --------------------------------------- | ---------------------------------------------------------------- |
| `list_posts`                            | List posts in a workspace, filter by status                      |
| `get_post`                              | Fetch a post by id                                               |
| `schedule_post`                         | Create a post for accounts or an account group                   |
| `edit_post`                             | Update an existing post                                          |
| `cancel_post`                           | Cancel a scheduled post                                          |
| `delete_post`                           | Permanently delete a post                                        |
| `list_post_deliveries`                  | Per-account delivery status for a post                           |
| `list_accounts`                         | List connected social accounts, optionally by group              |
| `get_account_health`                    | Check token freshness and rate-limit headroom                    |
| `list_workspaces`                       | List workspaces the user can access                              |
| `rename_account`                        | Set or clear an account's display name                           |
| `list_account_groups`                   | List account groups and their members                            |
| `get_account_group`                     | Fetch an account group                                           |
| `create_account_group`                  | Create an account group                                          |
| `rename_account_group`                  | Rename an account group                                          |
| `set_account_group_members`             | Replace the accounts in a group                                  |
| `delete_account_group`                  | Delete a group (its accounts stay connected)                     |
| `create_telegram_connect_code`          | Mint a one-time code to connect a Telegram chat                  |
| `get_telegram_connect_status`           | Check whether a Telegram connect code was used                   |
| `get_telegram_bot_commands`             | List the bot command menu in a Telegram chat                     |
| `set_telegram_bot_commands`             | Replace the bot command menu in a Telegram chat                  |
| `clear_telegram_bot_commands`           | Clear the bot command menu in a Telegram chat                    |
| `list_slack_channels`                   | List the channels a Slack account can post to                    |
| `list_slack_members`                    | List members of a Slack workspace, for DMs                       |
| `get_slack_identity`                    | Show the name and icon a Slack account posts under               |
| `set_slack_identity`                    | Set the name and icon a Slack account posts under                |
| `generate_caption`                      | AI-generate or improve a caption (1 credit)                      |
| `rewrite_for_platforms`                 | Rewrite content per target platform (1 credit each)              |
| `repurpose_url`                         | Turn a blog URL into N platform-optimized posts (6 credits)      |
| `get_ai_credits`                        | Show current AI credit balance                                   |
| `list_inbox`                            | List comments, mentions and DMs with filters                     |
| `list_inbox_threads`                    | List comment threads under your posts, or mentions               |
| `list_inbox_conversations`              | List DM conversations                                            |
| `get_inbox_unread_count`                | Count unread inbox items                                         |
| `mark_inbox_thread_read`                | Mark a comment thread or DM conversation read                    |
| `reply_to_inbox_item`                   | Reply on the platform, with media or quick replies on a DM       |
| `edit_inbox_comment`                    | Edit your own comment on the platform                            |
| `update_inbox_item`                     | Set an item to unread, read, resolved or snoozed                 |
| `hide_inbox_item`                       | Hide a comment on the platform                                   |
| `unhide_inbox_item`                     | Unhide a comment on the platform                                 |
| `delete_inbox_item`                     | Delete a comment, or your own reply, on the platform             |
| `like_inbox_item`                       | Like a comment or message on the platform                        |
| `unlike_inbox_item`                     | Remove your like                                                 |
| `pin_inbox_item`                        | Pin your own comment                                             |
| `unpin_inbox_item`                      | Unpin your own comment                                           |
| `react_to_inbox_item`                   | React to a DM, or remove your reaction                           |
| `start_inbox_conversation`              | Send a new DM, or answer a comment privately                     |
| `set_inbox_typing`                      | Show or clear the typing indicator in a DM                       |
| `list_inbox_approvals`                  | List drafted replies waiting for approval                        |
| `approve_inbox_reply`                   | Approve and send a drafted reply                                 |
| `reject_inbox_reply`                    | Reject a drafted reply                                           |
| `refresh_inbox`                         | Poll every inbox-capable account now                             |
| `list_ads`                              | List boosts and ads created through FoPost                       |
| `list_external_ads`                     | List ads on connected ad accounts made elsewhere                 |
| `list_boostable_posts`                  | List published posts that can be boosted                         |
| `list_ad_sources`                       | List ad connections, ad accounts and pages                       |
| `boost_post`                            | Boost a published post (starts paused, needs `publish`)          |
| `create_ad`                             | Create an ad (starts paused, needs `publish`)                    |
| `set_ad_status`                         | Pause or resume an ad (needs `publish`)                          |
| `refresh_ad`                            | Re-read delivery status and insights                             |
| `delete_ad`                             | End delivery and delete an ad (needs `publish`)                  |
| `list_audiences`                        | List saved audiences and pixels on an ad account                 |
| `search_ad_targeting`                   | Search locations, interests, behaviors and income brackets       |
| `list_lead_forms`                       | List lead forms on connected pages                               |
| `list_leads`                            | List one page of leads from a lead form                          |
| `get_ad_account_tree`                   | Read campaigns, ad sets and ads on an ad account                 |
| `create_ad_campaign`                    | Create a campaign (starts paused, needs `publish`)               |
| `get_ad_campaign`                       | Read one campaign                                                |
| `update_ad_campaign`                    | Rename, pause or resume a campaign (needs `publish`)             |
| `delete_ad_campaign`                    | Delete a campaign and its contents (needs `publish`)             |
| `duplicate_ad_campaign`                 | Copy a campaign (starts paused, needs `publish`)                 |
| `create_ad_set`                         | Create an ad set (starts paused, needs `publish`)                |
| `get_ad_set`                            | Read one ad set                                                  |
| `update_ad_set`                         | Change an ad set's status, budget or targeting (needs `publish`) |
| `delete_ad_set`                         | Delete an ad set and its ads (needs `publish`)                   |
| `duplicate_ad_set`                      | Copy an ad set (starts paused, needs `publish`)                  |
| `create_network_ad`                     | Create an ad inside an ad set (starts paused, needs `publish`)   |
| `get_network_ad`                        | Read one ad inside an ad set                                     |
| `update_network_ad`                     | Rename, pause, resume or swap an ad's creative (needs `publish`) |
| `delete_network_ad`                     | Delete an ad inside an ad set (needs `publish`)                  |
| `duplicate_network_ad`                  | Copy an ad (starts paused, needs `publish`)                      |
| `bulk_set_ad_status`                    | Pause or resume up to 50 objects (needs `publish`)               |
| `list_ad_creatives`                     | List creatives on an ad account                                  |
| `create_ad_creative`                    | Create an image, video or carousel creative                      |
| `get_ad_creative`                       | Read one creative                                                |
| `delete_ad_creative`                    | Delete a creative                                                |
| `get_audience`                          | Read one saved audience                                          |
| `update_audience`                       | Rename or redescribe a saved audience                            |
| `delete_audience`                       | Delete a saved audience                                          |
| `add_audience_users`                    | Add customer emails to a custom audience                         |
| `estimate_ad_reach`                     | Estimate the reach of a targeting                                |
| `get_ad_object_insights`                | Insights for a campaign, ad set or ad                            |
| `get_ad_insights`                       | Insights for an ad created through FoPost                        |
| `get_lead_form`                         | Read one lead form                                               |
| `archive_lead_form`                     | Archive a lead form                                              |
| `list_leads_feed`                       | List stored leads from subscribed pages                          |
| `list_lead_pages`                       | List pages subscribed to new leads                               |
| `subscribe_lead_page`                   | Subscribe a page to new leads and backfill                       |
| `unsubscribe_lead_page`                 | Unsubscribe a page from new leads                                |
| `get_google_business_location`          | Read a Business Profile location                                 |
| `update_google_business_location`       | Change its name, description, website or phone                   |
| `get_google_business_attributes`        | Read its attributes, or what Google offers                       |
| `update_google_business_attributes`     | Set attributes on the location                                   |
| `get_google_business_menus`             | Read its food menus                                              |
| `replace_google_business_menus`         | Replace the whole menu set                                       |
| `get_google_business_services`          | Read its service list                                            |
| `replace_google_business_services`      | Replace the whole service list                                   |
| `list_google_business_media`            | List the location's photos                                       |
| `add_google_business_media`             | Add a photo from the media library                               |
| `delete_google_business_media`          | Remove a photo                                                   |
| `list_google_business_place_actions`    | List the Book, Order and Reserve buttons                         |
| `create_google_business_place_action`   | Add an action link to the listing                                |
| `update_google_business_place_action`   | Change an action link                                            |
| `delete_google_business_place_action`   | Remove an action link                                            |
| `get_google_business_verification`      | List the ways it can be verified                                 |
| `start_google_business_verification`    | Start verifying the location                                     |
| `complete_google_business_verification` | Finish it with the PIN Google sent                               |
| `get_google_business_performance`       | Daily impressions, calls, clicks and search terms                |

## Setup

### 1. Get an API key

Generate one at <https://fopost.com/dashboard/api-keys> with the scopes you need (`posts`, `publish`, `accounts`, `workspaces` are most common; `publish` is required to publish, retry or cancel a post). Inbox tools need `inbox`, and liking, pinning, reacting, editing, starting a conversation, the typing indicator, reply media and quick replies, and deleting your own reply also need `publish`; ads tools need `ads`, and `boost_post`, `create_ad`, `set_ad_status`, `delete_ad`, `bulk_set_ad_status` and every create, update, delete and duplicate tool for campaigns, ad sets and network ads also need `publish`. A boost, ad, campaign, ad set or copy starts paused unless `paused` is `false`.

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

### Google Ads

The shared ads tools work across networks. What only Google has is its own set:
`list_google_keywords`, `create_google_keyword`, `set_google_keyword_status`,
`delete_google_keyword`, `google_keyword_ideas`, `list_google_search_terms`,
`list_google_negative_keywords`, `list_google_assets`, `create_google_asset`,
`list_google_asset_groups`, `list_google_local_services_leads`,
`list_google_conversion_actions`, and `run_google_ads_query` for a raw read-only GAQL
SELECT.

Each names `connection_id` and `customer_id`; the customer has to be an account the
connection's grant reaches. Changes need the `publish` scope as well as `ads`.
