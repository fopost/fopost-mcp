import { z } from 'zod';
import type { FoPostClient } from '../client.js';
import type { ToolDefinition } from '../types.js';

type MessagingSetting = 'ice_breakers' | 'persistent_menu' | 'greeting';

/** The URL segment each messaging-profile setting lives under. */
function messagingPath(accountId: string, setting: MessagingSetting): string {
  const segment =
    setting === 'ice_breakers'
      ? 'ice-breakers'
      : setting === 'persistent_menu'
        ? 'persistent-menu'
        : 'greeting';
  return `/v1/accounts/${accountId}/messaging/${segment}`;
}

export function accountsTools(client: FoPostClient): ToolDefinition[] {
  return [
    {
      name: 'list_accounts',
      description:
        'List connected social accounts in a workspace. Returns platform, username, primary flag, and connection status. Pass group_id to list only the accounts in an account group.',
      inputSchema: z.object({
        workspace_id: z.string().uuid(),
        group_id: z.string().uuid().optional().describe('Only accounts in this account group'),
      }),
      async execute(input) {
        return client.get('/v1/accounts', {
          workspace_id: input.workspace_id,
          group_id: input.group_id,
        });
      },
    },

    {
      name: 'rename_account',
      description:
        'Set the display name FoPost shows for a connected account. Pass null or an empty string to restore the platform name.',
      inputSchema: z.object({
        account_id: z.string().uuid(),
        display_name: z.string().max(255).nullable(),
      }),
      async execute(input) {
        return client.request('PATCH', `/v1/accounts/${input.account_id}`, {
          display_name: input.display_name,
        });
      },
    },

    {
      name: 'list_account_groups',
      description:
        'List account groups (named sets of accounts to post to together) with their member account ids.',
      inputSchema: z.object({
        workspace_id: z.string().uuid().optional(),
      }),
      async execute(input) {
        return client.get('/v1/account-groups', { workspace_id: input.workspace_id });
      },
    },

    {
      name: 'get_account_group',
      description: 'Fetch one account group with its member account ids.',
      inputSchema: z.object({
        id: z.string().uuid().describe('Account group id (uuid)'),
      }),
      async execute(input) {
        return client.get(`/v1/account-groups/${input.id}`);
      },
    },

    {
      name: 'create_account_group',
      description: 'Create an account group in a workspace, optionally with its first members.',
      inputSchema: z.object({
        workspace_id: z.string().uuid(),
        name: z.string().min(1).max(100),
        account_ids: z.array(z.string().uuid()).max(200).optional(),
      }),
      async execute(input) {
        return client.post('/v1/account-groups', {
          workspace_id: input.workspace_id,
          name: input.name,
          account_ids: input.account_ids,
        });
      },
    },

    {
      name: 'rename_account_group',
      description: 'Rename an account group.',
      inputSchema: z.object({
        id: z.string().uuid().describe('Account group id (uuid)'),
        name: z.string().min(1).max(100),
      }),
      async execute(input) {
        return client.request('PATCH', `/v1/account-groups/${input.id}`, { name: input.name });
      },
    },

    {
      name: 'set_account_group_members',
      description:
        'Replace the accounts in an account group with exactly this list. Accounts left out are removed from the group.',
      inputSchema: z.object({
        id: z.string().uuid().describe('Account group id (uuid)'),
        account_ids: z.array(z.string().uuid()).max(200),
      }),
      async execute(input) {
        return client.put(`/v1/account-groups/${input.id}/members`, {
          account_ids: input.account_ids,
        });
      },
    },

    {
      name: 'delete_account_group',
      description: 'Delete an account group. Its accounts stay connected.',
      inputSchema: z.object({
        id: z.string().uuid().describe('Account group id (uuid)'),
      }),
      async execute(input) {
        return client.delete(`/v1/account-groups/${input.id}`);
      },
    },

    {
      name: 'create_telegram_connect_code',
      description:
        'Mint a one-time Telegram connect code (valid 15 minutes). Sending `/connect <code>` to the bot in a chat, group or channel connects that chat; the deep links carry the code.',
      inputSchema: z.object({
        workspace_id: z
          .string()
          .uuid()
          .optional()
          .describe('Optional for a key bound to one workspace'),
      }),
      async execute(input) {
        return client.post('/v1/accounts/telegram/connect-code', {
          workspaceId: input.workspace_id,
        });
      },
    },

    {
      name: 'get_telegram_connect_status',
      description:
        'Check a Telegram connect code: pending, connected (with account_id), failed (with reason) or expired.',
      inputSchema: z.object({
        code: z.string().min(1),
      }),
      async execute(input) {
        return client.get('/v1/accounts/telegram/connect-code/status', { code: input.code });
      },
    },

    {
      name: 'get_telegram_bot_commands',
      description: 'List the command menu the bot shows in a connected Telegram chat.',
      inputSchema: z.object({
        account_id: z.string().uuid(),
      }),
      async execute(input) {
        return client.get(`/v1/accounts/${input.account_id}/telegram/commands`);
      },
    },

    {
      name: 'set_telegram_bot_commands',
      description:
        'Replace the command menu the bot shows in a connected Telegram chat with exactly this list.',
      inputSchema: z.object({
        account_id: z.string().uuid(),
        commands: z
          .array(
            z.object({
              command: z
                .string()
                .regex(/^[a-z0-9_]{1,32}$/)
                .describe('1-32 lowercase letters, digits or underscores, no leading slash'),
              description: z.string().min(1).max(256),
            }),
          )
          .min(1)
          .max(100),
      }),
      async execute(input) {
        return client.put(`/v1/accounts/${input.account_id}/telegram/commands`, {
          commands: input.commands,
        });
      },
    },

    {
      name: 'clear_telegram_bot_commands',
      description: 'Remove every command from the bot menu in a connected Telegram chat.',
      inputSchema: z.object({
        account_id: z.string().uuid(),
      }),
      async execute(input) {
        return client.delete(`/v1/accounts/${input.account_id}/telegram/commands`);
      },
    },

    {
      name: 'list_slack_channels',
      description:
        'List the channels a connected Slack account can post to, and which one it posts to now.',
      inputSchema: z.object({
        account_id: z.string().uuid(),
      }),
      async execute(input) {
        return client.get(`/v1/accounts/${input.account_id}/slack/channels`);
      },
    },

    {
      name: 'list_slack_members',
      description:
        'List people in a connected Slack workspace; a member id is the handle for start_inbox_conversation.',
      inputSchema: z.object({
        account_id: z.string().uuid(),
      }),
      async execute(input) {
        return client.get(`/v1/accounts/${input.account_id}/slack/members`);
      },
    },

    {
      name: 'get_slack_identity',
      description: 'Show the name and icon a connected Slack account posts under.',
      inputSchema: z.object({
        account_id: z.string().uuid(),
      }),
      async execute(input) {
        return client.get(`/v1/accounts/${input.account_id}/slack/identity`);
      },
    },

    {
      name: 'set_slack_identity',
      description:
        'Set the name and icon a connected Slack account posts under. Omitted fields stay, null clears one; set icon_url or icon_emoji, not both.',
      inputSchema: z.object({
        account_id: z.string().uuid(),
        username: z.string().min(1).max(80).nullable().optional(),
        icon_url: z.string().url().max(2048).nullable().optional().describe('http(s) image URL'),
        icon_emoji: z
          .string()
          .regex(/^:[a-z0-9_+'-]+:$/)
          .nullable()
          .optional()
          .describe('Emoji code, e.g. :rocket:'),
      }),
      async execute({ account_id, ...body }) {
        return client.request('PATCH', `/v1/accounts/${account_id}/slack/identity`, body);
      },
    },

    {
      name: 'list_discord_channels',
      description:
        "List a connected Discord server's text channels, which one the account posts to now, and can_post — false when a channel permission in Discord shuts the bot out, so publishing there would fail. A webhook connection answers 409 webhook_connection.",
      inputSchema: z.object({
        account_id: z.string().uuid(),
      }),
      async execute(input) {
        return client.get(`/v1/accounts/${input.account_id}/discord/channels`);
      },
    },

    {
      name: 'switch_discord_channel',
      description:
        'Move a connected Discord account to another channel in the same server. The channel must be one list_discord_channels returned with can_post true; otherwise it answers 409 channel_not_writable.',
      inputSchema: z.object({
        account_id: z.string().uuid(),
        channel_id: z.string().min(1).describe('Discord channel id'),
      }),
      async execute({ account_id, channel_id }) {
        return client.request('PATCH', `/v1/accounts/${account_id}/discord/channels/current`, {
          channel_id,
        });
      },
    },

    {
      name: 'get_discord_identity',
      description: 'Show the nickname and avatar the bot wears in a connected Discord server.',
      inputSchema: z.object({
        account_id: z.string().uuid(),
      }),
      async execute(input) {
        return client.get(`/v1/accounts/${input.account_id}/discord/identity`);
      },
    },

    {
      name: 'set_discord_identity',
      description:
        'Set the nickname and avatar the bot wears in a connected Discord server. Omitted fields stay, null clears one.',
      inputSchema: z.object({
        account_id: z.string().uuid(),
        username: z.string().min(1).max(32).nullable().optional(),
        avatar_url: z.string().url().max(2048).nullable().optional().describe('http(s) image URL'),
      }),
      async execute({ account_id, ...body }) {
        return client.request('PATCH', `/v1/accounts/${account_id}/discord/identity`, body);
      },
    },

    {
      name: 'list_discord_pins',
      description: "List the pinned messages in a connected Discord account's channel.",
      inputSchema: z.object({
        account_id: z.string().uuid(),
      }),
      async execute(input) {
        return client.get(`/v1/accounts/${input.account_id}/discord/messages/pinned`);
      },
    },

    {
      name: 'manage_discord_message',
      description:
        "Act on one message in a connected Discord account's channel: delete it, pin or unpin it, crosspost it from an announcement channel, or start a thread on it. A thread needs thread_name.",
      inputSchema: z.object({
        account_id: z.string().uuid(),
        message_id: z.string().min(1).describe('Discord message id'),
        action: z.enum(['delete', 'pin', 'unpin', 'crosspost', 'thread']),
        thread_name: z.string().min(1).max(100).optional().describe('Required for action=thread'),
        auto_archive_duration: z
          .union([z.literal(60), z.literal(1440), z.literal(4320), z.literal(10080)])
          .optional()
          .describe('Minutes of inactivity before a thread archives'),
      }),
      async execute({ account_id, message_id, action, thread_name, auto_archive_duration }) {
        const base = `/v1/accounts/${account_id}/discord/messages/${message_id}`;
        switch (action) {
          case 'delete':
            return client.delete(base);
          case 'pin':
            return client.post(`${base}/pin`);
          case 'unpin':
            return client.delete(`${base}/pin`);
          case 'crosspost':
            return client.post(`${base}/crosspost`);
          default:
            return client.post(`${base}/thread`, {
              name: thread_name,
              ...(auto_archive_duration ? { auto_archive_duration } : {}),
            });
        }
      },
    },

    {
      name: 'send_discord_dm',
      description:
        'Send one direct message to a member of a connected Discord server. The member id comes from list_discord_members.',
      inputSchema: z.object({
        account_id: z.string().uuid(),
        member_id: z.string().min(1).describe('Discord user id'),
        content: z.string().min(1).max(2000),
      }),
      async execute({ account_id, ...body }) {
        return client.post(`/v1/accounts/${account_id}/discord/dm`, body);
      },
    },

    {
      name: 'list_discord_events',
      description: "List the scheduled events on a connected Discord server's calendar.",
      inputSchema: z.object({
        account_id: z.string().uuid(),
      }),
      async execute(input) {
        return client.get(`/v1/accounts/${input.account_id}/discord/events`);
      },
    },

    {
      name: 'create_discord_event',
      description:
        'Add a scheduled event to a connected Discord server. Give channel_id for an event in a voice or stage channel, or location with an end_time for one somewhere else.',
      inputSchema: z.object({
        account_id: z.string().uuid(),
        name: z.string().min(1).max(100),
        description: z.string().max(1000).optional(),
        start_time: z.string().datetime(),
        end_time: z.string().datetime().optional(),
        channel_id: z.string().min(1).optional().describe('A voice or stage channel'),
        location: z.string().min(1).max(100).optional(),
      }),
      async execute({ account_id, ...body }) {
        return client.post(`/v1/accounts/${account_id}/discord/events`, body);
      },
    },

    {
      name: 'update_discord_event',
      description:
        'Change a Discord scheduled event. Omitted fields stay as they are; status is scheduled, active, completed or canceled.',
      inputSchema: z.object({
        account_id: z.string().uuid(),
        event_id: z.string().min(1).describe('Discord event id'),
        name: z.string().min(1).max(100).optional(),
        description: z.string().max(1000).optional(),
        start_time: z.string().datetime().optional(),
        end_time: z.string().datetime().optional(),
        channel_id: z.string().min(1).optional(),
        location: z.string().min(1).max(100).optional(),
        status: z.enum(['scheduled', 'active', 'completed', 'canceled']).optional(),
      }),
      async execute({ account_id, event_id, ...body }) {
        return client.request(
          'PATCH',
          `/v1/accounts/${account_id}/discord/events/${event_id}`,
          body,
        );
      },
    },

    {
      name: 'delete_discord_event',
      description: 'Remove a scheduled event from a connected Discord server.',
      inputSchema: z.object({
        account_id: z.string().uuid(),
        event_id: z.string().min(1).describe('Discord event id'),
      }),
      async execute({ account_id, event_id }) {
        return client.delete(`/v1/accounts/${account_id}/discord/events/${event_id}`);
      },
    },

    {
      name: 'list_discord_members',
      description:
        'List or search the members of a connected Discord server. A member id is what send_discord_dm and assign_discord_role take.',
      inputSchema: z.object({
        account_id: z.string().uuid(),
        query: z.string().min(1).optional().describe('Search by username or nickname prefix'),
        limit: z.number().int().min(1).max(1000).optional(),
      }),
      async execute({ account_id, query, limit }) {
        return client.get(`/v1/accounts/${account_id}/discord/members`, { q: query, limit });
      },
    },

    {
      name: 'list_discord_roles',
      description: 'List the roles on a connected Discord server, highest first.',
      inputSchema: z.object({
        account_id: z.string().uuid(),
      }),
      async execute(input) {
        return client.get(`/v1/accounts/${input.account_id}/discord/roles`);
      },
    },

    {
      name: 'create_discord_role',
      description: 'Add a role to a connected Discord server.',
      inputSchema: z.object({
        account_id: z.string().uuid(),
        name: z.string().min(1).max(100),
        color: z.number().int().min(0).max(0xffffff).optional().describe('RGB integer'),
        hoist: z.boolean().optional().describe('Show holders separately in the member list'),
        mentionable: z.boolean().optional(),
      }),
      async execute({ account_id, ...body }) {
        return client.post(`/v1/accounts/${account_id}/discord/roles`, body);
      },
    },

    {
      name: 'assign_discord_role',
      description:
        'Give a member of a connected Discord server a role, or take one away. Role and member ids come from list_discord_roles and list_discord_members.',
      inputSchema: z.object({
        account_id: z.string().uuid(),
        role_id: z.string().min(1).describe('Discord role id'),
        member_id: z.string().min(1).describe('Discord user id'),
        action: z.enum(['add', 'remove']).default('add'),
      }),
      async execute({ account_id, role_id, member_id, action }) {
        const path = `/v1/accounts/${account_id}/discord/roles/${role_id}/members/${member_id}`;
        return action === 'add' ? client.put(path) : client.delete(path);
      },
    },

    {
      name: 'list_pinterest_boards',
      description: 'List the boards a connected Pinterest account can pin to.',
      inputSchema: z.object({
        account_id: z.string().uuid(),
      }),
      async execute(input) {
        return client.get(`/v1/accounts/${input.account_id}/pinterest/boards`);
      },
    },
    {
      name: 'create_pinterest_board',
      description:
        'Create a board on a connected Pinterest account. Pass the returned id as the board_id platform setting to pin to it.',
      inputSchema: z.object({
        account_id: z.string().uuid(),
        name: z.string().min(1).max(180),
        description: z.string().max(500).optional(),
        privacy: z.enum(['PUBLIC', 'PROTECTED', 'SECRET']).optional(),
      }),
      async execute({ account_id, ...body }) {
        return client.post(`/v1/accounts/${account_id}/pinterest/boards`, body);
      },
    },
    {
      name: 'list_youtube_playlists',
      description:
        "List a connected channel's playlists, with the playlist new videos join by default marked.",
      inputSchema: z.object({
        account_id: z.string().uuid(),
      }),
      async execute(input) {
        return client.get(`/v1/accounts/${input.account_id}/youtube/playlists`);
      },
    },
    {
      name: 'create_youtube_playlist',
      description: 'Create a playlist on a connected YouTube channel.',
      inputSchema: z.object({
        account_id: z.string().uuid(),
        title: z.string().min(1).max(150),
        description: z.string().max(5000).optional(),
        privacy: z.enum(['public', 'unlisted', 'private']).optional(),
      }),
      async execute({ account_id, ...body }) {
        return client.post(`/v1/accounts/${account_id}/youtube/playlists`, body);
      },
    },
    {
      name: 'set_default_youtube_playlist',
      description:
        'Set the playlist a new video joins when a post does not pick one. Pass null to clear it.',
      inputSchema: z.object({
        account_id: z.string().uuid(),
        playlist_id: z.string().min(1).max(100).nullable(),
      }),
      async execute({ account_id, playlist_id }) {
        return client.put(`/v1/accounts/${account_id}/youtube/playlists/default`, {
          playlist_id,
        });
      },
    },
    {
      name: 'list_youtube_captions',
      description: "List the caption tracks on one of a connected channel's videos.",
      inputSchema: z.object({
        account_id: z.string().uuid(),
        video_id: z.string().min(1),
      }),
      async execute(input) {
        return client.get(
          `/v1/accounts/${input.account_id}/youtube/videos/${input.video_id}/captions`,
        );
      },
    },
    {
      name: 'upload_youtube_captions',
      description:
        'Upload a caption track to a published video. body is the subtitle file itself; YouTube reads SRT and WebVTT and works out which.',
      inputSchema: z.object({
        account_id: z.string().uuid(),
        video_id: z.string().min(1),
        language: z.string().min(2).max(20).describe('BCP-47 tag, e.g. en or pt-BR'),
        name: z.string().max(150).optional(),
        body: z.string().min(1),
        is_draft: z.boolean().optional(),
      }),
      async execute({ account_id, video_id, ...body }) {
        return client.post(`/v1/accounts/${account_id}/youtube/videos/${video_id}/captions`, body);
      },
    },
    {
      name: 'read_youtube_transcript',
      description: 'Read one caption track back as text.',
      inputSchema: z.object({
        account_id: z.string().uuid(),
        caption_id: z.string().min(1),
      }),
      async execute(input) {
        return client.get(`/v1/accounts/${input.account_id}/youtube/captions/${input.caption_id}`);
      },
    },
    {
      name: 'get_bluesky_languages',
      description:
        'Show the default post languages for a Bluesky connection. Bluesky filters the feed by language.',
      inputSchema: z.object({
        account_id: z.string().uuid(),
      }),
      async execute(input) {
        return client.get(`/v1/accounts/${input.account_id}/bluesky/languages`);
      },
    },
    {
      name: 'set_bluesky_languages',
      description:
        'Set the default post languages for a Bluesky connection. Up to three BCP-47 tags; an empty list clears them.',
      inputSchema: z.object({
        account_id: z.string().uuid(),
        languages: z.array(z.string().min(2).max(20)).max(3),
      }),
      async execute({ account_id, languages }) {
        return client.put(`/v1/accounts/${account_id}/bluesky/languages`, { languages });
      },
    },
    {
      name: 'get_tiktok_creator_info',
      description:
        'Read the switches TikTok enforces at publish time: which privacy levels are open, whether comments, Duet or Stitch are off, and the creator video length cap.',
      inputSchema: z.object({
        account_id: z.string().uuid(),
      }),
      async execute(input) {
        return client.get(`/v1/accounts/${input.account_id}/tiktok/creator-info`);
      },
    },
    {
      name: 'search_tiktok_music',
      description:
        "Search TikTok's Commercial Music Library. Pass a track id as the music_id platform setting on a post.",
      inputSchema: z.object({
        account_id: z.string().uuid(),
        q: z.string().min(1),
        limit: z.number().int().min(1).max(50).optional(),
      }),
      async execute({ account_id, ...query }) {
        return client.get(`/v1/accounts/${account_id}/tiktok/music`, query);
      },
    },
    {
      name: 'search_tiktok_locations',
      description:
        'Search the places a TikTok post can be tagged with. Pass a place id as the location_id platform setting.',
      inputSchema: z.object({
        account_id: z.string().uuid(),
        q: z.string().min(1),
        limit: z.number().int().min(1).max(50).optional(),
      }),
      async execute({ account_id, ...query }) {
        return client.get(`/v1/accounts/${account_id}/tiktok/locations`, query);
      },
    },
    {
      name: 'lookup_tiktok_video',
      description:
        "Resolve a TikTok share link to one of the connected account's own videos, for repurposing. TikTok serves no raw media file, so download_url is the share address.",
      inputSchema: z.object({
        account_id: z.string().uuid(),
        url: z.string().url(),
      }),
      async execute({ account_id, url }) {
        return client.post(`/v1/accounts/${account_id}/tiktok/video-download`, { url });
      },
    },
    {
      name: 'search_instagram_audio',
      description:
        'Search the tracks a Reel can carry. With no q Instagram answers with what is trending.',
      inputSchema: z.object({
        account_id: z.string().uuid(),
        q: z.string().optional(),
        audio_type: z.enum(['music', 'original_sound']).optional(),
      }),
      async execute({ account_id, ...query }) {
        return client.get(`/v1/accounts/${account_id}/instagram/audio`, query);
      },
    },
    {
      name: 'get_instagram_publishing_limit',
      description:
        'How many posts are left before Instagram refuses the next one in its rolling window.',
      inputSchema: z.object({
        account_id: z.string().uuid(),
      }),
      async execute(input) {
        return client.get(`/v1/accounts/${input.account_id}/instagram/publishing-limit`);
      },
    },
    {
      name: 'list_instagram_stories',
      description:
        'List the stories still inside their 24 hours, posted through FoPost or not. Asking for insights costs one extra call per story.',
      inputSchema: z.object({
        account_id: z.string().uuid(),
        insights: z.boolean().optional(),
      }),
      async execute({ account_id, ...query }) {
        return client.get(`/v1/accounts/${account_id}/instagram/stories`, query);
      },
    },
    {
      name: 'get_instagram_story_insights',
      description: 'Read the insight set for one live story.',
      inputSchema: z.object({
        account_id: z.string().uuid(),
        story_id: z.string().min(1),
      }),
      async execute(input) {
        return client.get(
          `/v1/accounts/${input.account_id}/instagram/stories/${input.story_id}/insights`,
        );
      },
    },
    {
      name: 'search_linkedin_mentions',
      description:
        'Find the organizations a LinkedIn post can mention, and the annotation to paste into the text. People are not searchable: LinkedIn has no public person search.',
      inputSchema: z.object({
        account_id: z.string().uuid(),
        q: z.string().min(1),
      }),
      async execute({ account_id, ...query }) {
        return client.get(`/v1/accounts/${account_id}/linkedin/mentions`, query);
      },
    },

    {
      name: 'get_account_health',
      description:
        'Check token freshness and rate-limit headroom for a single account. Useful when posts are failing — tells you if the OAuth token has expired.',
      inputSchema: z.object({
        account_id: z.string().uuid(),
      }),
      async execute(input) {
        return client.get(`/v1/accounts/${input.account_id}/health`);
      },
    },

    {
      name: 'get_messaging_setting',
      description:
        'Read one Meta messaging-profile setting for a Facebook Page or Instagram account: ice breakers, the persistent menu, or the greeting. Instagram carries ice breakers only; a network without the setting answers 400.',
      inputSchema: z.object({
        account_id: z.string().uuid(),
        setting: z
          .enum(['ice_breakers', 'persistent_menu', 'greeting'])
          .describe('Which part of the messaging profile to read'),
      }),
      async execute(input) {
        return client.get(messagingPath(input.account_id, input.setting));
      },
    },

    {
      name: 'set_ice_breakers',
      description:
        'Replace the tappable prompts Messenger or Instagram shows before the first message with exactly this list, up to four.',
      inputSchema: z.object({
        account_id: z.string().uuid(),
        ice_breakers: z
          .array(
            z.object({
              question: z.string().min(1).max(80),
              payload: z
                .string()
                .min(1)
                .max(1000)
                .describe('What your webhook receives when the prompt is tapped'),
            }),
          )
          .min(1)
          .max(4),
      }),
      async execute(input) {
        return client.put(`/v1/accounts/${input.account_id}/messaging/ice-breakers`, {
          ice_breakers: input.ice_breakers,
        });
      },
    },

    {
      name: 'set_persistent_menu',
      description:
        'Replace the always-visible Messenger menu with exactly these items, up to three. Facebook Pages only.',
      inputSchema: z.object({
        account_id: z.string().uuid(),
        call_to_actions: z
          .array(
            z.union([
              z.object({
                type: z.literal('postback'),
                title: z.string().min(1).max(30),
                payload: z.string().min(1).max(1000),
              }),
              z.object({
                type: z.literal('web_url'),
                title: z.string().min(1).max(30),
                url: z.string().url().describe('An http(s) link'),
              }),
            ]),
          )
          .min(1)
          .max(3),
        locale: z
          .string()
          .optional()
          .describe('Defaults to `default`, the menu every language falls back to'),
      }),
      async execute(input) {
        return client.put(`/v1/accounts/${input.account_id}/messaging/persistent-menu`, {
          persistent_menu: [
            { locale: input.locale ?? 'default', call_to_actions: input.call_to_actions },
          ],
        });
      },
    },

    {
      name: 'set_greeting',
      description:
        'Replace the text shown before a Messenger conversation starts. Facebook Pages only.',
      inputSchema: z.object({
        account_id: z.string().uuid(),
        text: z.string().min(1).max(160),
        locale: z.string().optional().describe('Defaults to `default`'),
      }),
      async execute(input) {
        return client.put(`/v1/accounts/${input.account_id}/messaging/greeting`, {
          greeting: [{ locale: input.locale ?? 'default', text: input.text }],
        });
      },
    },

    {
      name: 'clear_messaging_setting',
      description:
        'Clear one Meta messaging-profile setting: ice breakers, the persistent menu, or the greeting.',
      inputSchema: z.object({
        account_id: z.string().uuid(),
        setting: z.enum(['ice_breakers', 'persistent_menu', 'greeting']),
      }),
      async execute(input) {
        return client.delete(messagingPath(input.account_id, input.setting));
      },
    },

    {
      name: 'get_webhook_subscription',
      description:
        'Check what the network is delivering to the FoPost webhook for an account. `subscribed` is false when the subscription lapsed or a required field is missing — the usual reason an inbox looks quiet.',
      inputSchema: z.object({
        account_id: z.string().uuid(),
      }),
      async execute(input) {
        return client.get(`/v1/accounts/${input.account_id}/webhook-subscription`);
      },
    },

    {
      name: 'get_account_platform_metrics',
      description:
        "The numbers only this account's own network reports, in its own vocabulary rather than the cross-network one: ad-break earnings on a monetised Facebook Page, how viewers left an Instagram story, a YouTube retention curve and daily views, LinkedIn reactions split by type, the search terms behind a Google Business listing. Read from the newest collected snapshot, never fetched live. Each row carries the platform's own metric `key`, a `label`, a `kind` (count, duration_ms, currency_usd, ratio, series) and the `value`.",
      inputSchema: z.object({
        account_id: z.string().uuid(),
      }),
      async execute(input) {
        // A network whose metric access has not been granted yet answers 503
        // platform_metrics_unavailable rather than an empty set.
        return client.get(`/v1/accounts/${input.account_id}/insights`, { raw: 'true' });
      },
    },

    {
      name: 'resubscribe_webhook',
      description:
        'Re-subscribe the app to every webhook field an account needs, lapsed or not. Use after `get_webhook_subscription` reports it is not subscribed.',
      inputSchema: z.object({
        account_id: z.string().uuid(),
      }),
      async execute(input) {
        return client.post(`/v1/accounts/${input.account_id}/webhook-subscription`, {});
        // A network whose metric access has not been granted yet answers 503
        // platform_metrics_unavailable rather than an empty set.
        return client.get(`/v1/accounts/${input.account_id}/insights`, { raw: 'true' });
      },
    },

    {
      name: 'list_workspaces',
      description: 'List workspaces the authenticated user has access to.',
      inputSchema: z.object({}),
      async execute() {
        return client.get('/v1/workspaces');
      },
    },
  ];
}
