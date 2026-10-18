# Changelog

All notable changes to `@fopost/mcp` are documented here.

## Unreleased

### Added

- Ads tracking tools (10): `list_pixels`, `create_pixel`, `get_pixel`, `update_pixel`,
  `get_pixel_stats`, `get_event_match_quality`, `list_custom_conversions`,
  `create_custom_conversion`, `delete_custom_conversion` and `list_conversion_events`.
  All need the `ads` scope.

### Changed

- `upload_ad_conversions` events take `event_id`, `action_source`, `source_url`,
  `external_id`, `client_ip_address`, `client_user_agent`, `click_id`, `browser_id` and
  `content_ids`; the answer carries `id`, `accepted`, `eventCount` and `replayed`.

## 0.6.0

### Added

- `create_connect_session` and `get_connect_session`: hosted connect links that let
  one of your end users connect a social account into the workspace with no FoPost
  login. Need the `accounts` scope.
- Webhook tools (8): `list_webhooks`, `create_webhook`, `update_webhook`,
  `delete_webhook`, `test_webhook`, `list_webhook_deliveries`, `get_webhook_delivery`
  and `redeliver_webhook_delivery`. The signing secret comes back once, on create or
  rotate. Need the `webhooks` scope.
- Posting queue tools (6): `list_queue_slots`, `create_queue_slot`,
  `update_queue_slot`, `delete_queue_slot`, `get_queue_next` and `preview_queue`.
  `schedule_post` and `edit_post` take `schedule: "queue"` to drop a post into the
  next free slot. Need the `posts` scope.
- `unpublish_post`: takes a published post down on every network it is live on; the
  post stays as a record. Needs the `publish` scope.
- Automation tools (5): `list_automations`, `get_automation`,
  `list_automation_versions`, `get_automation_version` and
  `restore_automation_version`. Need the `automations` scope.

## 0.5.0

### Breaking

- `blog_update_settings` no longer takes `auto_publish`. Nothing publishes without
  approval: an article must be submitted with `blog_submit_article` before
  `blog_publish_article` or a `publish_at` on `blog_update_article` will take it;
  a draft answers 409.

### Changed

- `blog_plan_keywords` no longer fills the calendar. Results land as `suggested`
  keywords; setting one to `planned` with `blog_update_keyword` picks it for the next
  free date. `review_hold_days` is now the days before its planned date that a picked
  keyword starts being written.

### Added

- `blog_suggest_seeds`: about 10 search terms from the blog goal and topics; pass the
  current seeds to refine and a prompt to steer. Spends AI credits, needs `ai`.
- `blog_submit_article`: moves a draft, failed or rejected article to `in_review`.
  Needs the `posts` scope.
- `blog_update_settings` takes `goal`, `focus_topics` and `avoid_topics`, and
  `blog_list_articles` filters on `in_review`.
- WhatsApp Business tools (9): `get_whatsapp_profile`, `update_whatsapp_profile`,
  `list_whatsapp_templates`, `get_whatsapp_template_library`,
  `create_whatsapp_template` (from scratch or from a library entry),
  `list_whatsapp_flows`, `get_whatsapp_flow_responses`, `list_whatsapp_groups` and
  `get_whatsapp_account_state`. The platform owns these resources, so every tool is
  a live read or write and all of them answer 503 until WhatsApp is set up. They
  need the `accounts` scope.
- `get_upload_limits`: the largest file the account may upload, what unlocks the
  next size, the multipart ceiling and the allowed types. Needs the `posts` scope.
- `schedule_post` and `edit_post` take `file_paths`, up to 5 local files the server
  reads itself. Files at or under the multipart ceiling go in one request with the
  post; a bigger one is uploaded directly and attached by url. An oversize file
  answers a plain message naming the account's limit.
- Blog tools (15): `blog_get_settings`, `blog_update_settings`, `blog_list_keywords`,
  `blog_plan_keywords`, `blog_add_keyword`, `blog_update_keyword`, `blog_delete_keyword`,
  `blog_list_articles`, `blog_request_article`, `blog_get_article`, `blog_update_article`,
  `blog_regenerate_article`, `blog_publish_article`, `blog_reject_article` and
  `blog_delete_article`. Reads, settings and keyword edits need the `posts` scope;
  planning, requesting and regenerating spend AI credits and need `ai`;
  `blog_publish_article` needs `publish` and goes live on the configured target at
  once. Rotating the website secret and the website test are dashboard only and have
  no tool. These routes take `workspace_id` on the query.
- Broadcast tools (8): `list_broadcasts`, `get_broadcast`, `create_broadcast`,
  `update_broadcast`, `send_broadcast`, `cancel_broadcast`,
  `list_broadcast_recipients` and `delete_broadcast` — one message into every
  conversation the workspace already has with a segment of its contacts.
  Reading needs the `inbox` scope; sending and cancelling also need `publish`.
- Sequence tools (8): `list_sequences`, `get_sequence`, `create_sequence`,
  `update_sequence`, `enroll_in_sequence`, `unenroll_from_sequence`,
  `list_sequence_enrollments` and `delete_sequence` — a series of messages on a
  delay. Enrolling and unenrolling need `publish`.
- Both honour each network's messaging window server-side. Messenger and
  Instagram take a business-initiated message only within 24 hours of the
  contact's last one, so recipients outside it come back `skipped` with
  `skip_reason` `window_closed` and nothing is attempted — the number sent is
  often lower than the audience, and `list_broadcast_recipients` with
  `status=skipped` says who.
- Contacts tools (11): `list_contacts`, `get_contact`, `create_contact`,
  `update_contact`, `delete_contact`, `list_contact_conversations`,
  `import_contacts`, plus `list_contact_fields`, `create_contact_field`,
  `update_contact_field` and `delete_contact_field` for the columns a workspace
  keeps about a person. All need the `inbox` scope.
- `get_conversation_analytics`: inbox volume and reply time per thread. Needs
  the `analytics` scope, and each row's `key` is an opaque handle for the
  thread rather than the id or handle the inbox groups on.
- Meta messaging tools (7): `get_messaging_setting` and `clear_messaging_setting` for ice
  breakers, the persistent menu or the greeting, plus `set_ice_breakers` (Facebook Pages
  and Instagram), `set_persistent_menu` and `set_greeting` (Facebook Pages), and
  `get_webhook_subscription` / `resubscribe_webhook` for an account whose webhook lapsed.
  All need the `accounts` scope.
- `handover_conversation` passes a Messenger thread to another Meta app, or takes it back
  when no `app_id` is given. Needs the `inbox` and `publish` scopes.
- Knowledge base tools (6): `search_knowledge`, `list_knowledge_sources`,
  `create_knowledge_source`, `update_knowledge_source`, `sync_knowledge_source`
  and `delete_knowledge_source`. A source is an FAQ, a note, a URL on your own
  site or a plain-text/CSV media item; `search_knowledge` returns the passages
  closest to a question, so a drafted reply quotes the brand's own answer
  instead of inventing one. All need the `inbox` scope.

- Google Ads tools: keywords and keyword ideas, search terms, negative keyword lists,
  assets, Performance Max asset groups, Local Services leads, conversion actions, and
  `run_google_ads_query` for a raw GAQL read.
- `snapchat` is accepted wherever a platform is named.
- Slack tools (4): `list_slack_channels`, `list_slack_members` (a member id is the
  handle for `start_inbox_conversation`), `get_slack_identity` and
  `set_slack_identity` for the name and icon posts appear under. All need the
  `accounts` scope.
- Discord bot tools (15): `list_discord_channels`, `switch_discord_channel`,
  `get_discord_identity`, `set_discord_identity`, `list_discord_pins`,
  `manage_discord_message` (delete, pin, unpin, crosspost, thread), `send_discord_dm`,
  `list_discord_events`, `create_discord_event`, `update_discord_event`,
  `delete_discord_event`, `list_discord_members`, `list_discord_roles`,
  `create_discord_role` and `assign_discord_role`. They need the `accounts` scope,
  plus `publish` for anything that posts; a Discord connection made with a webhook
  answers `409 webhook_connection`.
- `list_discord_channels` now reports `can_post` per channel, so a channel a Discord
  permission shuts the bot out of is visible before a publish fails.
- Google Business Profile tools (19): read and edit a connected location's profile,
  attributes, food menus, services, photos (from the media library, JPEG or PNG),
  place action links and verification, plus `get_google_business_performance` for
  daily impressions, calls and clicks and the monthly search terms. Reads need the
  `accounts` scope, writes `publish` as well. Every one answers a 503
  `configuration_error` until Google grants the deployment Business Profile API
  access. There is deliberately no tool for handing a location to another
  workspace — this server exposes no move at all.
- Claude Code plugin (`.claude-plugin/`, `.mcp.json`, `skills/`). It installs the
  **hosted** server at `https://api.fopost.com/mcp`, not this npm package, and
  ships three skills: `schedule-a-week`, `triage-the-inbox` and `weekly-report`.
  The plugin carries its own version, independent of `@fopost/mcp`.
- Per-network extras (20), all under the `accounts` scope: Pinterest boards
  (`list_pinterest_boards`, `create_pinterest_board`), YouTube playlists and
  captions (`list_youtube_playlists`, `create_youtube_playlist`,
  `set_default_youtube_playlist`, `list_youtube_captions`,
  `upload_youtube_captions`, `read_youtube_transcript`), Bluesky post languages
  (`get_bluesky_languages`, `set_bluesky_languages`), TikTok creator info, music
  and place search and video lookup (`get_tiktok_creator_info`,
  `search_tiktok_music`, `search_tiktok_locations`, `lookup_tiktok_video`),
  Instagram audio, publishing limit and stories (`search_instagram_audio`,
  `get_instagram_publishing_limit`, `list_instagram_stories`,
  `get_instagram_story_insights`) and LinkedIn mentions
  (`search_linkedin_mentions`).
- `get_account_platform_metrics` reads the numbers only an account's own network reports,
  keyed by the platform's own metric names — ad-break earnings, story taps, a retention
  curve, the search terms behind a listing. Needs the `analytics` scope; a network whose
  metric access has not been granted yet answers `503 platform_metrics_unavailable`.
- Reddit tools (5): `list_reddit_subreddits`, `list_reddit_subreddit_rules`,
  `list_reddit_flairs` and `set_reddit_default_subreddit` (scope `accounts`),
  plus `validate_subreddit`, which answers whether a subreddit exists and takes
  a post before one is created (scope `posts`). A flair id is valid only in the
  subreddit it came from.
- `vote_inbox_item` votes a comment or message up or down, or takes the vote
  back with `none`, where `canVote` is true (scopes `inbox` and `publish`).
- Connected-site blog tools (8): `list_blogs`, `list_articles`, `get_article`,
  `create_article`, `update_article`, `delete_article`, `list_products` and
  `update_product` for the blogs, articles and products already on a connected
  WordPress site or Shopify store, addressed by the platform's own ids.
  `update_article` edits the live article in place and never creates a duplicate.
  Reads need the `posts` scope; the writes need `publish` too.
- Ads campaign tree tools (17): read an ad account's tree, and create, get,
  update, delete and duplicate campaigns, ad sets and ads inside an ad set, plus
  `bulk_set_ad_status`. Changes need the `ads` and `publish` scopes and start
  paused unless `paused` is `false`.
- Creative tools (4): list, create (image, video or carousel, with a call to
  action and URL tags), get and delete.
- Audience tools (4): get, update, delete and add users.
- `estimate_ad_reach`, `get_ad_object_insights` and `get_ad_insights`, with a
  date range, an optional breakdown and a daily timeline.
- Lead tools (6): get and archive a lead form, the leads feed (pass
  `nextCursor` back as `cursor`), and list, subscribe and unsubscribe lead pages.
- `create_ad` takes `url_tags`.
- Telegram tools (5): create a connect code, check its status, and get, set or
  clear a connected chat's bot commands. Keys need the `accounts` scope.

## 0.4.0

### Added

- Inbox action tools (8): edit your own comment, like, unlike, pin, unpin,
  react to a DM, start a conversation (by handle, or a private reply to a
  comment) and the typing indicator. Keys need the `inbox` and `publish` scopes.
- `reply_to_inbox_item` takes `media_ids` and `quick_replies` (which also need
  `publish`); `text` may be omitted when `media_ids` is given.
- Account group tools (6): list, get, create, rename, set members and delete.
  Keys need the `accounts` scope.
- `rename_account` sets or clears an account's display name.
- `list_accounts` takes `group_id`; `schedule_post` takes `account_group_id`,
  and `account_ids` may be omitted when a group is given.

### Changed

- `delete_inbox_item` also deletes your own reply, which needs `publish`.

## 0.3.0

### Added

- `inbox` tools (14): list items, threads and conversations, unread count, mark
  a thread read, reply, update state, hide, unhide, delete, approvals, and
  refresh. Keys need the `inbox` scope.
- `ads` tools (13): list ads, external ads, boostable posts and sources, boost
  a post, create an ad, set status, refresh, delete, audiences, targeting
  search, lead forms and leads. Keys need the `ads` scope; `boost_post`,
  `create_ad`, `set_ad_status` and `delete_ad` also need `publish`. A boost or
  ad starts paused unless `paused` is false.

## 0.2.2

### Changed

- Readme links point at `fopost.com/dashboard`. The old `app.fopost.com` host is
  retired, so those links no longer take a redirect hop.

## 0.2.1

### Fixed

- **Every tool call 404'd.** The server sent requests to `/api/v1/...`, but the
  FoPost API serves its routes at `/v1/...` on `https://api.fopost.com`, so every
  call made by 0.2.0 hit a path that does not exist. All 16 request paths now
  target `/v1`. Upgrade from 0.2.0 — no config change is needed, and
  `FOPOST_API_URL` still stays host-only.

### Added

- A regression test asserting every tool's request path starts with `/v1/` and
  never contains `/api/v1/`, plus a CI workflow running typecheck, tests, and
  build.
