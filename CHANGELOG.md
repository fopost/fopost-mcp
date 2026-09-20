# Changelog

All notable changes to `@fopost/mcp` are documented here.

## Unreleased

### Added

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

## 0.5.0

### Added

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
