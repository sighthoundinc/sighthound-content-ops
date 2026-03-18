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

## Ideas Page Interaction Invariants (MUST)

To keep idea intake predictable and avoid split editing patterns:

1. **Comments & References Visibility**: Comments and references remain visible by default on each idea card.
2. **No Inline Editing in Idea Cards**: Do not provide inline comment/reference editing or add-comment controls inside the card body.
3. **Single Edit Path**: Update idea title/site/comments-references through the **Edit Idea** modal only.
4. **Conversion Options**: Idea cards provide conversion actions for both blogs and social posts.

## Social Post Dedicated Editor Workflow (MUST)

The dedicated editor at `/social-posts/[id]` follows a guided 4-step flow:

1. **Setup** — Post Title, Platform(s), Publish Date, Canva Link/Page, Product, Type.
2. **Link Context (optional)** — Associated Blog search + linked blog actions.
3. **Write Caption** — UTF-8 editor focus with formatting tools and grouped copy actions.
4. **Review & Publish** — Checklist validation, status transitions, and stage-based final CTA labels:
   - Draft incomplete → `Save Draft`
   - Draft complete → `Move to Review`
   - In Review complete → `Mark Published`
