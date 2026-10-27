import { z } from 'zod';
import { seg, type FoPostClient } from '../client.js';
import type { ToolDefinition } from '../types.js';

const CONNECT_PLATFORMS = [
  'twitter',
  'instagram',
  'linkedin',
  'threads',
  'tiktok',
  'youtube',
  'reddit',
  'tumblr',
  'dribbble',
] as const;

/**
 * Hosted connect links: a single-use page that lets one of your own end
 * users connect a social account into the workspace without a FoPost login.
 * Both tools need the `accounts` scope.
 */
export function connectSessionsTools(client: FoPostClient): ToolDefinition[] {
  return [
    {
      name: 'create_connect_session',
      description:
        'Mint a hosted connect link, open for one hour, that lets one of your end users connect a social account into the workspace with no FoPost login. Returns the url to hand over; the account is tagged with external_user_id. redirect_url must be on a domain in the workspace redirect allowlist.',
      inputSchema: z.object({
        workspace_id: z
          .string()
          .uuid()
          .optional()
          .describe('Workspace id (uuid); may be omitted for a key bound to one workspace'),
        external_user_id: z
          .string()
          .min(1)
          .max(255)
          .describe('Your own id for the end user; stored on the connected account'),
        platforms: z
          .array(z.enum(CONNECT_PLATFORMS))
          .min(1)
          .max(CONNECT_PLATFORMS.length)
          .describe('Networks the user may pick from'),
        redirect_url: z
          .string()
          .url()
          .max(2048)
          .optional()
          .describe('Where the user is sent once connected; must be on an allowlisted domain'),
        branding: z
          .object({
            name: z.string().min(1).max(100).optional(),
            logo_url: z.string().url().max(2048).optional(),
          })
          .optional()
          .describe('Name and logo shown on the hosted page'),
      }),
      async execute(input) {
        return client.post('/v1/connect-sessions', {
          workspaceId: input.workspace_id,
          externalUserId: input.external_user_id,
          platforms: input.platforms,
          redirectUrl: input.redirect_url,
          branding: input.branding
            ? { name: input.branding.name, logoUrl: input.branding.logo_url }
            : undefined,
        });
      },
    },

    {
      name: 'get_connect_session',
      description:
        'Poll a hosted connect link: status moves from pending to used and account_id is set once the end user has connected. The url is not returned again.',
      inputSchema: z.object({
        id: z.string().uuid().describe('Connect session id (uuid)'),
      }),
      async execute(input) {
        return client.get(`/v1/connect-sessions/${seg(input.id)}`);
      },
    },
  ];
}
