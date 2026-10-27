import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FoPostClient } from './client.js';
import { MULTIPART_MAX_FILE_BYTES } from './files.js';
import { postsTools } from './tools/posts.js';

const UUID = '9b2f6c1e-0000-4000-8000-000000000001';

// Lets a test report a 100 MB+ size without writing that many bytes.
let fakeSize: number | null = null;
vi.mock('node:fs/promises', async (importOriginal) => {
  const real = await importOriginal<typeof import('node:fs/promises')>();
  return {
    ...real,
    stat: async (p: string) => {
      const s = await real.stat(p);
      // Keep the Stats prototype so isFile() still works on the faked copy.
      return fakeSize === null ? s : Object.assign(Object.create(s), { size: fakeSize });
    },
  };
});
const LIMITS = {
  maxFileBytes: 400 * 1024 * 1024,
  source: 'accounts',
  connectedAccounts: 5,
  largeUploadsEnabled: false,
  nextTier: { upToAccounts: 15, maxFileBytes: 2 * 1024 ** 3 },
  multipartMaxFileBytes: MULTIPART_MAX_FILE_BYTES,
  maxFilesPerUpload: 5,
  directUploadAvailable: true,
  allowedTypes: ['image/jpeg', 'video/mp4'],
};

type Call = { method: string; url: string; body: unknown; headers: Record<string, string> };
let calls: Call[];
let originalFetch: typeof globalThis.fetch;
let respond: (call: Call) => Response;
let dir: string;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

function tool(name: string) {
  const client = new FoPostClient({ apiKey: 'test-key', baseUrl: 'https://api.fopost.com' });
  return postsTools(client).find((t) => t.name === name)!;
}

async function smallFile(name: string) {
  const path = join(dir, name);
  await writeFile(path, Buffer.from([0xff, 0xd8, 0xff, 0x00]));
  return path;
}

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'fopost-mcp-'));
  calls = [];
  originalFetch = globalThis.fetch;
  respond = () => json({ data: { id: UUID } });
  globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
    const call: Call = {
      method: init?.method ?? 'GET',
      url: String(input),
      body: init?.body,
      headers: (init?.headers ?? {}) as Record<string, string>,
    };
    calls.push(call);
    return respond(call);
  }) as unknown as typeof fetch;
});

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe('get_upload_limits', () => {
  it('reads /v1/media/limits with the workspace in the query and returns the payload', async () => {
    respond = () => json({ data: LIMITS });
    const result = await tool('get_upload_limits').execute({ workspace_id: UUID });
    expect(calls[0].url).toBe(`https://api.fopost.com/v1/media/limits?workspaceId=${UUID}`);
    expect(result).toEqual(LIMITS);
    expect(Object.keys(result as object).sort()).toEqual(
      [
        'allowedTypes',
        'connectedAccounts',
        'directUploadAvailable',
        'largeUploadsEnabled',
        'maxFileBytes',
        'maxFilesPerUpload',
        'multipartMaxFileBytes',
        'nextTier',
        'source',
      ].sort(),
    );
  });
});

describe('schedule_post with file_paths', () => {
  it('sends a small file as one multipart request with the JSON in a post field', async () => {
    const path = await smallFile('photo.jpg');
    await tool('schedule_post').execute({
      workspace_id: UUID,
      content: 'hi',
      account_ids: [UUID],
      publish_now: false,
      file_paths: [path],
    });

    expect(calls).toHaveLength(1);
    expect(calls[0].method).toBe('POST');
    expect(calls[0].url).toBe('https://api.fopost.com/v1/posts');
    expect(calls[0].headers['Content-Type']).toBeUndefined();
    const form = calls[0].body as FormData;
    expect(form).toBeInstanceOf(FormData);
    expect(JSON.parse(form.get('post') as string)).toMatchObject({ workspace_id: UUID });
    const files = form.getAll('files') as File[];
    expect(files).toHaveLength(1);
    expect(files[0].name).toBe('photo.jpg');
    expect(files[0].type).toBe('image/jpeg');
  });

  it('refuses to send a large file to a non-https presigned url', async () => {
    fakeSize = MULTIPART_MAX_FILE_BYTES + 1;
    try {
      const path = await smallFile('clip.mp4');
      respond = () =>
        json({
          data: {
            uploadId: 'up_1',
            uploadUrl: 'http://169.254.169.254/x',
            method: 'PUT',
            headers: {},
          },
        });
      await expect(
        tool('schedule_post').execute({
          workspace_id: UUID,
          content: 'hi',
          account_ids: [UUID],
          publish_now: false,
          file_paths: [path],
        }),
      ).rejects.toThrow(/non-https/);
      expect(calls.map((c) => c.url)).toEqual(['https://api.fopost.com/v1/media/presign']);
    } finally {
      fakeSize = null;
    }
  });

  it('presigns, PUTs and completes a large file, then attaches it by url', async () => {
    const bigSize = MULTIPART_MAX_FILE_BYTES + 1;
    fakeSize = bigSize;
    try {
      const path = await smallFile('clip.mp4');
      respond = (call) => {
        if (call.url.endsWith('/v1/media/presign')) {
          return json(
            {
              data: {
                uploadId: 'up_1',
                uploadUrl: 'https://storage.example/staging/1',
                method: 'PUT',
                headers: { 'Content-Type': 'video/mp4' },
              },
            },
            201,
          );
        }
        if (call.url.startsWith('https://storage.example/'))
          return new Response(null, { status: 200 });
        if (call.url.endsWith('/complete')) {
          return json({
            data: { id: UUID, url: 'https://cdn.example/clip.mp4', mimeType: 'video/mp4' },
          });
        }
        return json({ data: { id: UUID } });
      };

      await tool('schedule_post').execute({
        workspace_id: UUID,
        content: 'hi',
        account_ids: [UUID],
        publish_now: false,
        file_paths: [path],
      });

      expect(calls.map((c) => [c.method, c.url])).toEqual([
        ['POST', 'https://api.fopost.com/v1/media/presign'],
        ['PUT', 'https://storage.example/staging/1'],
        ['POST', 'https://api.fopost.com/v1/media/presign/up_1/complete'],
        ['POST', 'https://api.fopost.com/v1/posts'],
      ]);
      expect(JSON.parse(calls[0].body as string)).toEqual({
        workspaceId: UUID,
        filename: 'clip.mp4',
        mimeType: 'video/mp4',
        size: bigSize,
      });
      expect(calls[1].headers['Content-Type']).toBe('video/mp4');
      const post = JSON.parse(calls[3].body as string);
      expect(post.content[0].media).toEqual([
        { type: 'video', url: 'https://cdn.example/clip.mp4', name: 'clip.mp4' },
      ]);
    } finally {
      fakeSize = null;
    }
  });

  it('turns a 413 file_too_large into a plain message quoting the limit', async () => {
    const path = await smallFile('photo.jpg');
    respond = () =>
      json(
        {
          error: 'file_too_large',
          message: 'server wording',
          max_file_bytes: 400 * 1024 * 1024,
          file_bytes: 4,
          upgrade_url: 'https://fopost.com/dashboard/billing',
        },
        413,
      );

    await expect(
      tool('schedule_post').execute({
        workspace_id: UUID,
        content: 'hi',
        account_ids: [UUID],
        publish_now: false,
        file_paths: [path],
      }),
    ).rejects.toThrow(
      '"photo.jpg" is too large: this account allows files up to 400 MB. Raise the limit at https://fopost.com/dashboard/billing',
    );
  });
});
