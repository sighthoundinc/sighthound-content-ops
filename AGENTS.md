# Project Rules

Use Deft as the rules framework for this repository.

Primary entrypoint:
- See `deft/main.md`

Apply Deft lazily based on task type (language/tool/interface) and follow the layered precedence defined by Deft.

Project-specific Deft files:
- `deft/PROJECT.md`
- `deft/SPECIFICATION.md`

## UI Table Layout Invariants (MUST)

To prevent pagination breakage, pagination control misalignment, and unpredictable row height growth:

1. **Fixed Row Heights**: Keep all table rows at stable/fixed visual height per density mode (compact/comfortable). Long content must NOT expand rows.
2. **Single-Line Truncation**: Truncate long text in table cells (titles, names, descriptions) to a single line with ellipsis (`truncate`). Always include full value via `title` attribute for tooltip on hover.
3. **Overflow Constraints**: Apply `overflow-hidden` + explicit `max-width`/`width` constraints to cells containing long content to enforce hard layout limits.
4. **Pagination Boundary**: Keep pagination controls (row limit, page controls) structurally outside the table body. Controls must never render between table rows or appear to be pushed by row expansion.

These rules apply to all table implementations (DataTable, DashboardTable, etc.) across the application.
