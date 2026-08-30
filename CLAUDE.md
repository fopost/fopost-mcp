# CLAUDE.md

Guidance for Claude Code (claude.ai/code) when working in this repository.

## What This Is

`@fopost/mcp` — a Model Context Protocol server that exposes the FoPost REST API as MCP tools, so
any MCP-aware client (Claude Desktop, Cursor, ChatGPT desktop, Continue) can list, schedule, edit,
and publish social posts, inspect account health, and run the AI features. Published on npm and run
with `npx -y @fopost/mcp`. TypeScript, ESM only, Node >= 18, bin `fopost-mcp`, MIT.

**It does not depend on `@fopost/sdk`.** `src/client.ts` is a ~90-line `fetch` wrapper written in
this repo, and the only runtime dependencies are `@modelcontextprotocol/sdk`, `zod`, and
`zod-to-json-schema`. Do not add the SDK "to share code" — the whole point of the hand-rolled
client is that the published tarball stays tiny and has no FoPost dependency to keep in lockstep.
It is still bound by the API contract in `fopost-api-collections/openapi.json` and breaks when
that contract changes.

## Brand Rules

- The product is **FoPost** (`fopost.com`). Never write "OwlStack" — retired Aug 2026.
- Never write an email address. Support is https://fopost.com/contact and GitHub issues.
- Never name AI providers/models, infrastructure vendors, or any person. Tool descriptions and
  error text are user-facing: name the FoPost feature, never the model behind it.

## Architecture

```
src/index.ts     stdio server: reads config, builds the tool list, wires ListTools + CallTool
src/client.ts    FoPostClient (fetch) + FoPostApiError
src/types.ts     ToolDefinition<S> — name, description, Zod inputSchema, typed execute
src/tools/       posts.ts (7 tools), accounts.ts (3), ai.ts (4) — 14 total
src/globals.d.ts declares __PKG_VERSION__, injected by tsup from package.json
```

**Transport is stdio.** `console.error` is the only safe logging channel; anything written to
stdout corrupts the JSON-RPC stream.

**Config is environment only**, read once at startup in `readConfig()`:

| Variable | Required | Default |
| :--- | :--- | :--- |
| `FOPOST_API_KEY` | yes, or the process exits 1 | — |
| `FOPOST_API_URL` | no | `https://api.fopost.com` |

`FOPOST_API_URL` is **host-only**; the version prefix belongs to the tool paths. **That prefix is
`/v1`, never `/api/v1`** — the API serves its routes at `/v1` on the bare host and nothing rewrites
the path, so an `/api/v1` request 404s. That was the 0.2.0 bug; `src/api-path.test.ts` pins every
tool's path and fails if the prefix drifts back.

**How a request flows.** `FoPostClient` sends `X-API-Key: <key>`, `Content-Type: application/json`
and `User-Agent: @fopost/mcp` to `${baseUrl}${path}`, where every path is written out in full in
the tool file (`/v1/posts`, `/v1/accounts`, `/v1/ai/credits`, …). A `{ data: … }` body is
unwrapped when `data` is the only key. A non-2xx JSON body becomes `FoPostApiError` with
the API's `message`, `error` code, and status; a non-JSON body becomes one carrying the raw text.

**Deliberately absent from the client**: retries, backoff, `Retry-After` handling, and a request
timeout. The client makes one attempt. An MCP client drives the retry by asking again, so do not
add a retry loop without a reason that survives that argument.

**Errors never throw out of a tool.** `CallToolRequestSchema` catches, and answers
`{ isError: true, content: [{ type: 'text', … }] }` — an unknown tool name, a Zod parse failure,
a `FoPostApiError` rendered as `FoPost API <status> (<code>): <message>`, or any other error's
message. Scope and workspace checks happen server-side; this server never pre-authorizes.

**Adding a tool** is one entry in the relevant `src/tools/*.ts` array: `name` (snake_case verb
first), a one-line `description` the model reads to choose it, a Zod `inputSchema`
(`zodToJsonSchema` publishes it), and an `execute` that calls one client method. Register a new
tool file in the `allTools` array in `src/index.ts`, and add the row to the README table.

## Commands

```bash
npm install
npm run lint          # tsc --noEmit — the only type checker in this repo
npm test              # vitest run
npm run test:watch    # vitest
npm run build         # tsup → dist/ (ESM + .d.ts), injects __PKG_VERSION__
npm run dev           # tsx watch src/index.ts
npm start             # node dist/index.js
npm run format        # prettier --write .
npm run format:check
```

`.github/workflows/ci.yml` runs `lint`, `test`, and `build` on every push to `main` and every pull
request; `release.yml` runs the same checks on a tag before publishing. Formatting is not checked
by CI, so run `npm run format:check` by hand.

## Conventions

- ESM everywhere; relative imports carry the `.js` suffix on `.ts` source.
- Prettier: single quotes, semicolons, trailing commas, 100 cols, 2-space indent.
- Zod schemas are the input contract; never hand-write JSON Schema.
- Tool descriptions are prompt surface, not documentation. One line, says what it does and when
  to pick it, no implementation detail.
- Comments short and only for a non-obvious "why".
- The version lives in `package.json` alone. `src/index.ts` reads `__PKG_VERSION__`; never type a
  version literal.

## Testing

Vitest, one suite so far: `src/api-path.test.ts`, which executes every registered tool against a
stubbed `fetch` and asserts each request path starts with `/v1/` and never contains `/api/v1/`. It
also fails when a tool is added without an input fixture, so new tools get their path pinned too.
A test here **must stub `globalThis.fetch` and must never reach the live API.**

The rest of the verification:

1. `npm run lint` and `npm run build`.
2. The release workflow's **smoke test**, which packs the tarball, installs it into a scratch
   project the way a user would, drives a real `initialize` → `notifications/initialized` →
   `tools/list` handshake over stdio, and fails if the tool count is zero. A broken `bin` or an
   unregistered tool file cannot ship past it.
3. By hand: point a local MCP client at `node dist/index.js` with `FOPOST_API_KEY` set.

If a change needs more than that, add the case to the suite in the same PR rather than shipping
untested logic.

## Releasing

`@fopost/mcp` **is published on npm** (0.2.1 at the time of writing). Releasing is a tag:

1. Bump `version` in `package.json` and commit.
2. `git tag v<version> && git push --tags` — the tag must match `package.json` exactly or the
   workflow fails its version check.
3. `.github/workflows/release.yml` runs lint, tests, build, and the packed-tarball smoke test, then
   publishes with `npm publish --access public --provenance`. It skips silently if that version is
   already on npm, so a re-run is safe.

Requires repo secret **`NPM_TOKEN`** (the job errors out explicitly when it is unset). Provenance
needs `id-token: write`, which the workflow already grants. `workflow_dispatch` runs everything
except the publish step.

## Git

Conventional Commits, atomic. Branch `feature/<description>`, merge to `main` via PR.
Never `gh pr create` — push the branch and hand over the compare link.
