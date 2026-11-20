import { z } from 'zod';
import type { FoPostClient } from '../client.js';
import type { ToolDefinition } from '../types.js';

const VIDEO_EDIT_OPS = [
  'trim',
  'cut',
  'speed',
  'merge',
  'volume',
  'remove_silence',
  'denoise',
  'subtitles',
  'translate_subtitles',
  'clips',
  'music',
  'voiceover',
  'watermark',
  'cover',
  'reframe',
  'audiogram',
] as const;

/** Create suite: every tool here needs the `posts` scope and the create grant. */
export function createTools(client: FoPostClient): ToolDefinition[] {
  return [
    {
      name: 'edit_video',
      description: `Edit a library video into a new library file: runs the operations in order (${VIDEO_EDIT_OPS.join(', ')}). Params use camelCase, for example trim {startSec,endSec}, speed {factor}, volume {level,mute}, subtitles {style:'plain'|'word_highlight',burnIn}, clips {count,minSec,maxSec,aspect}, reframe {aspect:'9:16'}. Runs in the background and returns a job id; it never publishes. Subtitles, translation, clips and voiceover use AI credits and need the ai scope.`,
      inputSchema: z.object({
        media_id: z.string().min(1).max(64).describe('A library video id'),
        operations: z
          .array(
            z.object({
              op: z.enum(VIDEO_EDIT_OPS),
              params: z.record(z.string(), z.unknown()).optional(),
            }),
          )
          .min(1)
          .max(10)
          .describe('Ordered edits, each {op, params}'),
        workspace_id: z.string().uuid().optional(),
      }),
      async execute(input) {
        return client.post('/v1/video-edits', input);
      },
    },
  ];
}
