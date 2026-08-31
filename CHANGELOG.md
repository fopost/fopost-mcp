# Changelog

All notable changes to `@fopost/mcp` are documented here.

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
