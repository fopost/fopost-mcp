/**
 * Thin HTTP client for the OwlStack REST API. Authenticates with the
 * user-provided API key (set as OWLSTACK_API_KEY env var). The MCP server
 * passes the same key on every call — scope checks happen server-side.
 */

export type OwlStackClientOptions = {
  apiKey: string;
  baseUrl: string;
};

export class OwlStackApiError extends Error {
  status: number;
  code?: string;
  constructor(message: string, status: number, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
    this.name = 'OwlStackApiError';
  }
}

export class OwlStackClient {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(opts: OwlStackClientOptions) {
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
    const url = new URL(this.baseUrl + path);
    if (query) {
      for (const [k, v] of Object.entries(query)) {
        if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
      }
    }

    const res = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': this.apiKey,
        'User-Agent': '@owlstackapp/mcp',
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    const contentType = res.headers.get('content-type') ?? '';
    if (!contentType.includes('application/json')) {
      if (!res.ok) {
        const text = await res.text();
        throw new OwlStackApiError(text || `HTTP ${res.status}`, res.status);
      }
      throw new OwlStackApiError(`Unexpected response: ${contentType}`, res.status);
    }

    const json = (await res.json()) as Record<string, unknown>;

    if (!res.ok) {
      const message =
        (typeof json.message === 'string' && json.message) ||
        (typeof json.error === 'string' && json.error) ||
        `HTTP ${res.status}`;
      throw new OwlStackApiError(message, res.status, json.error as string | undefined);
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

  delete<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>('DELETE', path, body);
  }
}
