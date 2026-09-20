# Changelog

All notable changes to `@fopost/mcp` are documented here.

## Unreleased

### Added

- WhatsApp Business tools (9): `get_whatsapp_profile`, `update_whatsapp_profile`,
  `list_whatsapp_templates`, `get_whatsapp_template_library`,
  `create_whatsapp_template` (from scratch or from a library entry),
  `list_whatsapp_flows`, `get_whatsapp_flow_responses`, `list_whatsapp_groups` and
  `get_whatsapp_account_state`. The platform owns these resources, so every tool is
  a live read or write and all of them answer 503 until WhatsApp is set up. They
  need the `accounts` scope.

- Slack tools (4): `list_slack_channels`, `list_slack_members` (a member id is the
  handle for `start_inbox_conversation`), `get_slack_identity` and
  `set_slack_identity` for the name and icon posts appear under. All need the
  `accounts` scope.

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
