# API Standards

**Effective**: 2026-04-03  
**Scope**: All routes in `src/app/api/`  
**Enforcement**: Code review + contract helpers (`withApiContract`, `api-response` utilities)

## Core principle: resource-oriented contracts
Routes should follow REST semantics unless the operation is explicitly workflow/system oriented.

Standard resource patterns:
- `GET /api/resource` → list/fetch
- `POST /api/resource` → create
- `GET /api/resource/[id]` → fetch one
- `PATCH /api/resource/[id]` → update
- `DELETE /api/resource/[id]` → delete

## Disallowed route patterns
Avoid action suffixes for standard CRUD:
- `/api/resource/[id]/delete`
- `/api/resource/[id]/update`
- `/api/resource/[id]/create`

## Approved non-CRUD exceptions
The following are valid specialized workflow/system actions:
- `/api/social-posts/[id]/transition`
- `/api/social-posts/[id]/reopen-brief`
- `/api/social-posts/reminders`
- `/api/social-posts/overdue-checks`
- `/api/blogs/[id]/transition`
- `/api/blogs/overdue-checks`
- `/api/admin/wipe-app-clean`
- `/api/events/record-activity`

## Retired compatibility endpoint
- `DELETE /api/ideas/[id]/delete` is retired and returns `410 Gone`.
- Canonical delete contract is `DELETE /api/ideas/[id]`.
- Do not introduce new action-suffix CRUD compatibility proxies.

## Route inventory note
REST standards define target architecture; not every resource currently has full CRUD API parity.

Current gap example:
- `DELETE /api/blogs/[id]` is not implemented yet (blog deletes currently rely on direct client DB mutation paths + RLS safeguards).
## Remote MCP exception
`POST /api/mcp` is a protocol endpoint, not a CRUD resource route. It uses the official MCP SDK’s stateless Streamable HTTP transport and MCP JSON-RPC envelopes, so it must not be wrapped in `withApiContract` or converted to the app’s ordinary REST response envelope.
- Authenticate the exact `Authorization: Bearer <MCP_API_TOKEN>` credential before resolving the configured actor.
- Derive actor identity only from `MCP_ACT_AS_USER_ID`, require an active profile, and resolve permissions through the shared server-permission path.
- The route uses the service-role database client; every registered tool must perform its explicit application-permission check before protected reads.
- Tool schemas must be strict and bounded. Register read-only tools only; do not accept caller identity or add mutations without a separate security/design review.
- Preserve opaque `401` for missing/invalid credentials, `503` for invalid actor configuration/resolution, and `429` with `Retry-After` for the best-effort per-process request limiter.
- Tool-call telemetry is best-effort and excludes bearer credentials and tool arguments. See `SPECIFICATION.md` §18 and `OPERATIONS.md` §14.

## Status code contract
Use conventional codes, but keep response-shape consistency explicit:
- `200 OK` — successful read/update/delete when returning JSON body
- `201 Created` — successful create
- `204 No Content` — allowed only when intentionally returning no body
- `400 Bad Request` — validation failure
- `403 Forbidden` — auth/permission failure
- `404 Not Found` — resource missing
- `409 Conflict` — state conflict or concurrency issue
- `500 Internal Server Error` — unexpected failure

## Implementation checklist for new endpoints
- Route shape follows REST or documented exception pattern.
- Input/output/error formats are validated and contract-normalized.
- Permission and RLS boundaries are enforced.
- No raw internal errors are leaked to callers.
- Client parsing paths use `parseApiResponseJson()`, `isApiFailure()`, `getApiErrorMessage()`.
- Docs are updated when route behavior changes.
