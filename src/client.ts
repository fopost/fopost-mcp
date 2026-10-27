/**
 * Thin HTTP client for the FoPost REST API. Authenticates with the
 * user-provided API key (set as FOPOST_API_KEY env var). The MCP server
 * passes the same key on every call — scope checks happen server-side.
 */

export type FoPostClientOptions = {
  apiKey: string;
  baseUrl: string;
};

export class FoPostApiError extends Error {
  status: number;
  code?: string;
  details?: Record<string, unknown>;
  retryAfter?: string;
  constructor(
    message: string,
    status: number,
    code?: string,
    details?: Record<string, unknown>,
    retryAfter?: string,
  ) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
    this.retryAfter = retryAfter;
    this.name = 'FoPostApiError';
  }
}

/**
 * One URL path segment from a tool argument. Encoding keeps `/`, `?` and `#`
 * inside the segment; a lone `.` or `..` is refused because URL parsing
 * resolves it even when encoded, which would move the request to another route.
 */
export function seg(value: string | number): string {
  const s = String(value);
  if (s === '' || s === '.' || s === '..') {
    throw new Error(`Invalid id: ${JSON.stringify(s)}`);
  }
  return encodeURIComponent(s);
}

/**
 * Last line of defence for a path built anywhere in the tools: no query,
 * fragment, backslash, control character, or dot segment (plain or encoded).
 */
export function assertSafePath(path: string): void {
  if (!path.startsWith('/v1/') || /[?#\\\u0000-\u001f\u007f]/.test(path)) {
    throw new Error(`Refusing unsafe request path: ${path}`);
  }
  for (const part of path.split('/')) {
    const lower = part.toLowerCase();
    if (lower === '.' || lower === '..' || /^(\.|%2e){1,2}$/.test(lower)) {
      throw new Error(`Refusing unsafe request path: ${path}`);
    }
  }
}

export class FoPostClient {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(opts: FoPostClientOptions) {
    this.apiKey = opts.apiKey;
    // Normalise — no trailing slash so path concatenation is predictable.
    this.baseUrl = opts.baseUrl.replace(/\/$/, '');
  }

  async request<T>(
    method: string,
    path: string,
    body?: unknown,
    query?: Record<string, string | number | undefined>,
  ): Promise<T> {
    assertSafePath(path);
    const url = new URL(this.baseUrl + path);
    if (query) {
      for (const [k, v] of Object.entries(query)) {
        if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
      }
    }

    // A FormData body lets fetch set the multipart boundary itself.
    const isForm = body instanceof FormData;
    const res = await fetch(url, {
      method,
      headers: {
        ...(isForm ? {} : { 'Content-Type': 'application/json' }),
        'X-API-Key': this.apiKey,
        'User-Agent': '@fopost/mcp',
      },
      body: isForm ? body : body ? JSON.stringify(body) : undefined,
    });

    const contentType = res.headers.get('content-type') ?? '';
    const retryAfter = res.headers.get('retry-after') ?? undefined;
    if (!contentType.includes('application/json')) {
      if (!res.ok) {
        const text = await res.text();
        throw new FoPostApiError(
          text || `HTTP ${res.status}`,
          res.status,
          undefined,
          undefined,
          retryAfter,
        );
      }
      throw new FoPostApiError(`Unexpected response: ${contentType}`, res.status);
    }

    const json = (await res.json()) as Record<string, unknown>;

    if (!res.ok) {
      const message =
        (typeof json.message === 'string' && json.message) ||
        (typeof json.error === 'string' && json.error) ||
        `HTTP ${res.status}`;
      throw new FoPostApiError(
        message,
        res.status,
        json.error as string | undefined,
        json,
        retryAfter,
      );
    }

    // Most endpoints wrap in `{ data: ... }`. Unwrap when single-key.
    if (json && typeof json === 'object' && 'data' in json && Object.keys(json).length === 1) {
      return json.data as T;
    }
    return json as T;
  }

  get<T>(path: string, query?: Record<string, string | number | undefined>): Promise<T> {
    return this.request<T>('GET', path, undefined, query);
  }

  post<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>('POST', path, body);
  }

  put<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>('PUT', path, body);
  }

  patch<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>('PATCH', path, body);
  }

  delete<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>('DELETE', path, body);
  }
}
