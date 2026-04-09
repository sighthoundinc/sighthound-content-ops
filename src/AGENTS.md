# src Rules

Inherit root project rules and apply Deft with a frontend TypeScript focus.

Primary references:
- `../deft/main.md`
- `../deft/coding/coding.md`
- `../deft/languages/typescript.md`
- `../deft/interfaces/web.md`
- `../deft/coding/testing.md`
- `../deft/PROJECT.md`

Context-specific overrides for `src/`:
- Keep UI components in `src/components/` and shared domain/business logic in `src/lib/`.
- Prefer small, focused, reversible changes in app routes under `src/app/`.
- Treat auth and permission paths as high-risk (`src/lib/permissions.ts`, `src/lib/server-permissions.ts`, `src/providers/auth-provider.tsx`) and call out impact clearly.
- Maintain strong TypeScript typing; avoid `any` unless there is no practical alternative.
- Table UI invariants (MUST):
  - Tabular rows must keep stable/fixed visual height per density mode (no content-driven row expansion).
  - Long text in table cells (especially titles/names) must be single-line truncated with ellipsis and include full value via tooltip/title.
  - Cells that can receive long content must enforce overflow constraints (`overflow-hidden` + width constraint).
  - Pagination controls must render outside table body and remain visually detached from row content at all times.

## React Hooks Stability (MUST)
- When a helper function is used inside another hook (`useEffect`, `useMemo`, or `useCallback`) and declared at component scope, wrap that helper in `useCallback` with complete dependencies.
- Prefer hook-local helpers for one-off logic to avoid unstable callback references leaking into dependency arrays.
- When using debounced inputs, side-effect hooks and memoized callbacks must depend on the debounced value used for filtering/fetching.
- Missing or unstable hook dependencies in touched files must be fixed before merge; do not ship new `react-hooks/exhaustive-deps` warnings.
