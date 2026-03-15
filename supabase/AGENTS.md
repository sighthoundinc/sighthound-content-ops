# supabase Rules

Inherit root project rules and apply Deft with a Supabase schema/RLS/functions focus.

Primary references:
- `../deft/main.md`
- `../deft/coding/coding.md`
- `../deft/languages/sql.md`
- `../deft/languages/typescript.md`
- `../deft/interfaces/rest.md`
- `../deft/coding/testing.md`
- `../deft/PROJECT.md`

Context-specific overrides for `supabase/`:
- Treat `supabase/migrations/` as append-only; add new timestamped migrations instead of rewriting applied ones.
- For schema, RLS, permissions, or trigger changes, explicitly call out risk and rollback strategy.
- Keep edge functions in `supabase/functions/**/index.ts` minimal and side-effect-aware.
- Prefer idempotent SQL patterns where possible and avoid destructive operations unless explicitly requested.
