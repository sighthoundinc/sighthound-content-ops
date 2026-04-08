# Delete Functionality Implementation Status

## Current state

### Implemented REST delete endpoints
- **Social Posts**: `DELETE /api/social-posts/[id]` (`src/app/api/social-posts/[id]/route.ts`)
- **Ideas**: `DELETE /api/ideas/[id]` (`src/app/api/ideas/[id]/route.ts`)
- **Legacy ideas endpoint (retired)**: `DELETE /api/ideas/[id]/delete` now returns `410 Gone` and no longer proxies requests.

### Not yet implemented as REST endpoint
- **Blogs**: `DELETE /api/blogs/[id]` does **not** currently exist.
- Blog delete operations are currently executed from UI surfaces through direct Supabase mutations, with database RLS as the hard authorization boundary.

## Behavior by resource

### Social posts
- Requires `delete_social_post` permission at API boundary.
- Defense-in-depth ownership check in route: creator or admin only.
- Published posts are blocked (`status === "published"`).
- Idempotent success behavior:
  - If record does not exist, route returns `200` with `"Post already deleted"`.
  - If record is deleted, route returns `200` with `deletedPostId` and `deletedPostTitle`.

### Ideas
- Requires `delete_idea` permission at API boundary.
- Defense-in-depth ownership check in route: creator or admin only.
- No published-state guard for ideas.
- Idempotent success behavior:
  - If record does not exist, route returns `200` with `"Idea already deleted"`.
  - If record is deleted, route returns `200` with `deletedIdeaId` and `deletedIdeaTitle`.
- Legacy compatibility note:
  - `DELETE /api/ideas/[id]/delete` is retired and always returns `410 Gone`.
  - Clients must call `DELETE /api/ideas/[id]`.

### Blogs
- No dedicated API delete route yet.
- Database RLS policies enforce delete safety:
  - creator/admin only
  - published blogs blocked (`publisher_status = 'completed'`)
- Linked social posts are not a hard DB delete blocker; `social_posts.associated_blog_id` uses `ON DELETE SET NULL`.

## Database safety layer
- `prevent_delete_published_social_posts` policy blocks deleting published social posts.
- `prevent_delete_published_blogs` policy blocks deleting published blogs.
- Resource-specific delete policies in comprehensive RLS migrations continue enforcing creator/admin ownership constraints.

## Response contract note
- Current delete endpoints use `200` JSON responses for success and idempotent already-deleted cases.
- `204 No Content` is not used by current route implementations.

## Known gaps
1. Add canonical blog delete route: `DELETE /api/blogs/[id]`.
2. Move blog delete UI flows to API contract boundary instead of direct client-table deletes.
3. Decide whether blog delete should reject when linked social posts exist (current behavior nulls association).
4. Ensure delete activity logging is consistent across all entities through canonical event patterns.

## Recommended next steps
1. Implement `DELETE /api/blogs/[id]` with parity to social/idea delete contracts.
2. Keep idempotent semantics aligned across all three entities.
3. Add regression coverage for:
   - published delete rejection
   - creator/admin ownership checks
   - repeated delete request idempotency
   - linked social-post handling behavior
