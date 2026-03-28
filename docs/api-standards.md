# API Standards

**Effective**: 2025-03-29  
**Scope**: All routes in `src/app/api/`  
**Enforcement**: Code review + lint rules (future)

---

## Core Principle: RESTful Endpoints

All API routes must follow standard REST semantics. **No action-based URLs allowed.**

### Standard REST Patterns

```
GET    /api/resource              → List/fetch resource
POST   /api/resource              → Create resource
GET    /api/resource/[id]         → Fetch single resource
PATCH  /api/resource/[id]         → Update resource
DELETE /api/resource/[id]         → Delete resource
```

### Forbidden Patterns

❌ **Never use**:
- `/api/resource/[id]/delete` → Use `DELETE /api/resource/[id]`
- `/api/resource/[id]/update` → Use `PATCH /api/resource/[id]`
- `/api/resource/[id]/create` → Use `POST /api/resource`
- `/api/resource/action` → Use appropriate HTTP verb + resource path
- `/api/resource/do-something` → Use appropriate HTTP verb + resource path

### Exception: RPC-Style Endpoints

Some endpoints can deviate from REST if they represent non-CRUD operations:

✅ **Allowed special cases**:
- `/api/social-posts/[id]/transition` — State machine transition (action on resource)
- `/api/social-posts/[id]/reopen-brief` — Specialized workflow action
- `/api/social-posts/reminders` — Batch reminder operation
- `/api/admin/wipe-app-clean` — Admin system operation
- `/api/events/record-activity` — Event recording

**Rationale**: These are legitimate state-change or bulk operations that don't map cleanly to PATCH/POST. They should be:
1. Clearly documented as special cases
2. Scoped to admin or specialized workflows
3. Not duplicated with REST equivalents

---

## Directory Structure

### Correct ✅

```
src/app/api/
├── ideas/
│   └── [id]/
│       └── route.ts              ← GET, POST, PATCH, DELETE handlers
└── social-posts/
    └── [id]/
        ├── route.ts              ← GET, PATCH, DELETE handlers
        ├── transition/route.ts    ← Special case (state machine)
        └── reopen-brief/route.ts  ← Special case (workflow action)
```

### Incorrect ❌

```
src/app/api/
├── ideas/
│   └── [id]/
│       ├── delete/route.ts       ← WRONG: Use DELETE /api/ideas/[id]
│       ├── update/route.ts       ← WRONG: Use PATCH /api/ideas/[id]
│       └── route.ts
└── blogs/
    └── [id]/
        └── delete/route.ts       ← WRONG: Use DELETE /api/blogs/[id]
```

---

## Deprecation & Migration

### Existing Legacy Endpoints

The following endpoints are **deprecated** and scheduled for removal:

| Endpoint | Status | Migration | Removal Target |
|----------|--------|-----------|-----------------|
| `DELETE /api/ideas/[id]/delete` | Proxy | Use `DELETE /api/ideas/[id]` | v2.0 (2 releases) |

### Deprecation Process

1. **Add deprecation comment** with date, owner, and removal target
2. **Add console.warn() log** with clear migration message
3. **Wait 1–2 releases** for clients to migrate
4. **Remove the endpoint** and verify logs show zero usage
5. **Document removal** in CHANGELOG

---

## Implementation Checklist

When adding a new API route:

- [ ] Route follows REST pattern (GET/POST/PATCH/DELETE on `[id]/route.ts`)
- [ ] HTTP method correctly maps to operation (POST=create, PATCH=update, DELETE=delete)
- [ ] Query parameters documented in endpoint comments
- [ ] Error cases handled with appropriate status codes (400, 403, 404, 500)
- [ ] RLS policies in place for authorization
- [ ] TypeScript types for request/response defined
- [ ] Integration with `withApiContract` for response normalization
- [ ] Tested with TypeScript check and linting

---

## Status Codes

Use standard HTTP status codes:

- `200 OK` — Successful GET/PATCH/DELETE
- `201 Created` — Successful POST (resource created)
- `204 No Content` — Successful DELETE with no response body
- `400 Bad Request` — Validation error
- `403 Forbidden` — Permission denied
- `404 Not Found` — Resource not found
- `409 Conflict` — Constraint violation (e.g., delete with linked data)
- `500 Internal Server Error` — Unexpected server error

---

## Examples

### ✅ Correct: DELETE with proper pattern

```typescript
// src/app/api/ideas/[id]/route.ts
export const DELETE = withApiContract(async function DELETE(request, { params }) {
  const auth = await requirePermission(request, "delete_idea");
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { id } = await params;
  // ... deletion logic
  return NextResponse.json({ data: { deletedId: id }, message: "Deleted" }, { status: 200 });
});
```

### ❌ Incorrect: Legacy `/delete` subdirectory

```typescript
// src/app/api/ideas/[id]/delete/route.ts ← WRONG
// This pattern is deprecated and confuses REST semantics
```

---

## Future: Automated Enforcement

Planned improvements:

- ESLint rule to flag `/delete/`, `/update/`, `/create/` subdirectories
- Pre-commit hook to validate HTTP methods against route patterns
- API documentation generator from route structure

---

## Questions?

Refer to existing implementations:
- Modern: `src/app/api/social-posts/[id]/route.ts` (DELETE handler at [id] level)
- Legacy (deprecated): `src/app/api/ideas/[id]/delete/route.ts` (proxy, removal planned)

