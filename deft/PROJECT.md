# PROJECT.md

Sighthound Content Ops — project-specific Deft configuration.

This repository keeps its canonical project documentation at the repo root, not inside `deft/`. Use the root docs as the authoritative sources for product scope, rules, and workflows.

Legend (from RFC2119): `!` = MUST, `~` = SHOULD, `≉` = SHOULD NOT, `⊗` = MUST NOT, `?` = MAY.

## Authoritative project docs (at repo root)

- [../AGENTS.md](../AGENTS.md) — project rules, invariants, contracts, and Deft conflict-resolution order
- [../SPECIFICATION.md](../SPECIFICATION.md) — technical specification (product scope, shared workflow model, contracts)
- [../README.md](../README.md) — setup, scripts, and project overview
- [../HOW_TO_USE_APP.md](../HOW_TO_USE_APP.md) — user guide
- [../OPERATIONS.md](../OPERATIONS.md) — deployment, monitoring, admin workflows
- `../docs/PERMISSIONS.md` — permission reference

## Deft usage in this project

- ! Framework files live under `deft/` (strategies, skills, languages, interfaces, etc.).
- ! Project-specific rules and invariants live in [../AGENTS.md](../AGENTS.md).
- ! Project-specific specification lives in [../SPECIFICATION.md](../SPECIFICATION.md).
- ⊗ Do not duplicate project content inside `deft/`; keep `deft/` limited to framework material and this pointer file.

## Tech stack

- TypeScript / Next.js (app lives in `../src/`; see [../README.md](../README.md))
- Supabase / PostgreSQL (see `../supabase/` and [../SPECIFICATION.md](../SPECIFICATION.md))
- Tailwind CSS

When Deft loads a framework language guide (e.g. `languages/typescript.md`), apply it in combination with `../AGENTS.md` invariants. `../AGENTS.md` invariants take precedence on conflict (see conflict-resolution order in `../AGENTS.md`).

## Strategy

Use [Interview](strategies/interview.md) for new greenfield features where a spec is needed; use [Brownfield](strategies/brownfield.md) for changes to existing surfaces.

## Workflow

Project scripts and validation commands are defined in `../package.json`. See [../README.md](../README.md) for the full list. Do not assume the generic Deft Python/Taskfile commands apply here.

## Standards

All project standards, contracts, and invariants are documented in [../AGENTS.md](../AGENTS.md). Do not restate them here.
