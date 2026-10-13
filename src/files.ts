import { readFile, stat } from 'node:fs/promises';
import * as fs from 'node:fs';
import { basename, extname } from 'node:path';
import { FoPostApiError, type FoPostClient } from './client.js';

export const MAX_FILES_PER_POST = 5;
export const MULTIPART_MAX_FILE_BYTES = 100 * 1024 * 1024;

const MIME_BY_EXT: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.mp4': 'video/mp4',
  '.mov': 'video/quicktime',
  '.webm': 'video/webm',
};

export type PostMediaItem = { type: 'image' | 'video' | 'gif'; url: string; name: string };
type ContentBlock = { text?: string | null; media?: PostMediaItem[] | null; position?: number };
type LocalFile = { name: string; mimeType: string; size: number; blob: Blob };

export function formatBytes(bytes: number): string {
  if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(1).replace(/\.0$/, '')} GB`;
  return `${Math.round(bytes / 1024 ** 2)} MB`;
}

function mediaType(mimeType: string): PostMediaItem['type'] {
  if (mimeType === 'image/gif') return 'gif';
  return mimeType.startsWith('video/') ? 'video' : 'image';
}

async function loadFile(path: string): Promise<LocalFile> {
  const mimeType = MIME_BY_EXT[extname(path).toLowerCase()];
  if (!mimeType) {
    throw new Error(
      `"${basename(path)}" is not a supported file type. Allowed: ${Object.keys(MIME_BY_EXT).join(', ')}`,
    );
  }
  const { size } = await stat(path);
  // openAsBlob streams the bytes; older Node reads them into memory.
  const openAsBlob = (fs as { openAsBlob?: (p: string, o: { type: string }) => Promise<Blob> })
    .openAsBlob;
  const blob = openAsBlob
    ? await openAsBlob(path, { type: mimeType })
    : new Blob([await readFile(path)], { type: mimeType });
  return { name: basename(path), mimeType, size, blob };
}

function tooLargeMessage(err: FoPostApiError, name: string): string {
  const max = err.details?.max_file_bytes;
  const upgrade = err.details?.upgrade_url;
  if (typeof max !== 'number') return err.message;
  return (
    `"${name}" is too large: this account allows files up to ${formatBytes(max)}.` +
    (typeof upgrade === 'string' ? ` Raise the limit at ${upgrade}` : '')
  );
}

async function uploadDirect(
  client: FoPostClient,
  workspaceId: string,
  file: LocalFile,
): Promise<PostMediaItem> {
  const presigned = await client.post<{
    uploadId: string;
    uploadUrl: string;
    method: string;
    headers: Record<string, string>;
  }>('/v1/media/presign', {
    workspaceId,
    filename: file.name,
    mimeType: file.mimeType,
    size: file.size,
  });
  const res = await fetch(presigned.uploadUrl, {
    method: presigned.method,
    headers: presigned.headers,
    body: file.blob,
  });
  if (!res.ok) throw new Error(`Uploading "${file.name}" failed: HTTP ${res.status}`);
  const stored = await client.post<{ url: string; mimeType?: string }>(
    `/v1/media/presign/${presigned.uploadId}/complete`,
  );
  return { type: mediaType(stored.mimeType ?? file.mimeType), url: stored.url, name: file.name };
}

// One multipart request when every file fits the ceiling, else direct upload each and attach by url.
export async function sendPostWithFiles<T>(
  client: FoPostClient,
  method: 'POST' | 'PUT',
  path: string,
  body: Record<string, unknown>,
  filePaths: string[],
  workspaceId: string,
): Promise<T> {
  if (filePaths.length > MAX_FILES_PER_POST) {
    throw new Error(`A post takes at most ${MAX_FILES_PER_POST} files.`);
  }
  const files = await Promise.all(filePaths.map(loadFile));
  try {
    if (files.every((f) => f.size <= MULTIPART_MAX_FILE_BYTES)) {
      const form = new FormData();
      form.append('post', JSON.stringify(body));
      for (const f of files) form.append('files', f.blob, f.name);
      return await client.request<T>(method, path, form);
    }
    const items: PostMediaItem[] = [];
    for (const f of files) {
      try {
        items.push(await uploadDirect(client, workspaceId, f));
      } catch (err) {
        if (err instanceof FoPostApiError && err.code === 'file_too_large') {
          throw new Error(tooLargeMessage(err, f.name));
        }
        throw err;
      }
    }
    const content = Array.isArray(body.content) ? (body.content as ContentBlock[]) : [];
    const [first, ...rest] = content;
    const head = {
      ...(first ?? { text: null, position: 0 }),
      media: [...(first?.media ?? []), ...items],
    };
    return await client.request<T>(method, path, { ...body, content: [head, ...rest] });
  } catch (err) {
    if (err instanceof FoPostApiError && err.code === 'file_too_large') {
      const over = files.find((f) => f.size === err.details?.file_bytes) ?? files[0];
      throw new Error(tooLargeMessage(err, over.name));
    }
    throw err;
  }
}
