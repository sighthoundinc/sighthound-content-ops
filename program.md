# Slack Contract AutoResearch

## Goal

**Maximise `slack_contract_pass` on the Slack notification fixture set.**

Current baseline: **`slack_contract_pass = 0.9657`**

Metric definition: weighted pass rate of the rules in `eval/slack/rules.mjs`
against 27 frozen fixtures in `eval/slack/fixtures.mjs`. Each fixture is a
`NotifyPayload` fed through `buildMessage()` from
`supabase/functions/slack-notify/message.mjs`; each rule checks a specific
invariant from AGENTS.md §"Slack Notification Display Contract" plus a small
set of aspirational hardening rules marked on fixtures with `aspirational: true`.

Why this matters: Slack notifications are the primary async handoff surface
between writers, editors, publishers, and admins. Every regression in shape
(wrong line order, raw role labels, un-neutralized `@channel` pings, link
previews escaping to unfurl) degrades operational trust and spams the channel.
A ratcheted contract score is a durable quality signal.

## What you CAN modify

Only the files listed in `EDITABLE_FILES`:

**`supabase/functions/slack-notify/message.mjs`** — pure message builder. Main
lever for most rule fixes.
- `buildMessage()` — line assembly, deep-link formatting.
- `normalizeName()` / `resolveAssignedTo()` — actor/assignee handling.
- `normalizeCommentBody()` — ping neutralization, length cap, line-break
  preservation.
- `EVENT_CONTENT_TYPE` / `EVENT_ACTION` — per-event display strings.
- `buildDeepLink()` / `resolveAppUrl()` — URL assembly.
- You may introduce new helpers as long as they stay pure and free of Deno
  or Node specifics (both runtimes consume this module).

**`supabase/functions/slack-notify/index.ts`** — Deno wiring only.
- Env resolution (`SLACK_BOT_TOKEN`, `SLACK_MARKETING_CHANNEL`, etc.).
- Request validation.
- Delivery flags (`SLACK_DELIVERY_FLAGS`).
- Do NOT put formatting logic here — keep it in `message.mjs`.

**`src/lib/server-slack-emitter.ts`** — payload normalization before invoking
the edge function.
- Name resolution against `profiles.full_name`.
- Dedup + role-label filtering.
- Shape of the payload that lands in `buildMessage()`.

## What you CANNOT modify

- `eval/slack/fixtures.mjs` — frozen evaluation input.
- `eval/slack/rules.mjs` — frozen evaluation logic.
- `scripts/slack-contract-lint.mjs` — metric extractor must remain stable.
- Any other file outside `EDITABLE_FILES`.
- Do NOT install new packages.
- Do NOT change the Slack Display Contract in AGENTS.md (this is the spec we
  are ratcheting TOWARD, not AWAY from).

## Experiment Priorities

Ordered by expected impact — each is a single, targeted change. Fixture/rule
references point at the specific failure driving the experiment.

1. **Trim `title` whitespace in `buildMessage` header assembly.**
   Fixture: `title_whitespace_must_be_trimmed`.
   Rule: `header_expectations`. Cheapest fix; a single `.trim()` on the title
   before formatting the header line.

2. **Case-insensitive dedupe of multi-assignee names in `resolveAssignedTo()`.**
   Fixture: `assignee_dedupe_must_be_case_insensitive`.
   Rule: `assigned_to_equals`. Keep the first-seen casing while deduping by
   `.toLowerCase()` to collapse `["Ali Creator", "ali creator", "ALI CREATOR"]`
   to a single entry.

3. **Canonicalize site to `SH` / `RED` when a domain form is provided.**
   Fixtures: `site_domain_must_canonicalize_to_SH`,
   `site_domain_must_canonicalize_to_RED`.
   Rule: `header_expectations`. Add a small `canonicalizeSite()` helper: if
   input matches `sighthound.com`, `sighthound`, `sh` (case-insensitive) →
   `SH`; if matches `redactor.com`, `redactor`, `red` → `RED`; otherwise pass
   through untouched. Use in `buildMessage()` for the header only.

4. **HTML-escape `<` and `>` in the title when formatting the header.**
   Fixture: `title_with_angle_brackets_must_be_escaped`.
   Rule: `header_expectations`. Slack will otherwise interpret angle brackets
   as link/mention syntax. Escape to `&lt;` / `&gt;` in the header assembly
   (NOT in the comment body — that path is already sanitized).

5. **Factor the three header-safety transforms into a single
   `renderHeader(payload)` helper.** Once #1, #3, #4 are landing, consolidate
   so the transforms live in one place with clear test hooks.

6. **Share title trimming with emitter-side payload normalization.** In
   `src/lib/server-slack-emitter.ts`, normalize the `title` field before it
   is forwarded to `buildMessage`, so the trimming is belt-and-suspenders.

7. **Pre-filter duplicate target user IDs case-insensitively in
   `emitWorkflowSlackEvent()` before DB resolution.** Reduces profile lookups
   for the assignee-dedupe case.

8. **Stable ordering of `targetUserNames` across the pipeline.** Today the
   order is preserved from input; add a tie-breaker (input order) and ensure
   the dedupe preserves the first seen form. Prevents future flip-flop
   between runs.

9. **Combine #1 + #2 + #3 + #4** into a single release-ready commit after
   each has landed individually. Verify no per-rule regression.

10. **More radical: render the header through a template object**
    (`{ contentType, title, site }`) and centralize escape/trim/canonicalize.
    Only worth it if #5 proves too narrow.

## Simplicity Criterion

- Improvement < `MIN_DELTA` (currently 0.005) → discard even if positive.
- A fix that requires editing more than ~30 lines to move the metric by
  <0.02 is over-engineered.
- A fix that deletes code or simplifies an existing helper is ALWAYS worth
  keeping.

## Agent Workflow (Copy-Paste Prompt)

Use this prompt to start a session (Prompt 2 from the AutoResearch README):

```
Run the autoresearch loop for [N] hours. Follow program.md §Agent Workflow exactly:
1. Start the session: ./scripts/start-session.sh [N] 0.9657
2. Before every experiment: ./scripts/check-time.sh — stop immediately if it exits 1
3. Read program.md and results/autoresearch.tsv, pick the next untried experiment,
   make ONE targeted change, then run:
   ./scripts/autoresearch.sh "<short description of change>"
4. When check-time.sh exits 1 or autoresearch.sh exits 3, STOP — no more experiments —
   update program.md to reflect the new best metric and tried experiments,
   then summarise what improved.
```

Smoke-test the scorer first:

```
node scripts/slack-contract-lint.mjs --verbose
```

The one-line metric must appear as `slack_contract_pass=<0..1>` for the
metric extractor to work.

## The Ratchet Protocol

Each iteration (managed by `scripts/autoresearch.sh`):

1. Agent calls `./scripts/check-time.sh` — exits 1 means **stop immediately**.
2. Agent reads this doc + `results/autoresearch.tsv` (experiment history).
3. Agent picks the next untried experiment from the priority list.
4. Agent implements ONE targeted change to the editable files above.
5. Agent calls `./scripts/autoresearch.sh "<description>"`:
   - exit 0: improvement committed, `BASELINE_METRIC` updated in `research.env`.
   - exit 1: no improvement, files restored.
   - exit 2: crash (linter threw or metric extraction failed), files restored.
   - exit 3: deadline passed — **stop immediately**.

**HARD STOP RULE**: When `check-time.sh` exits 1 or `autoresearch.sh` exits 3,
stop the loop immediately. Do not ask for permission. Summarise results from
`results/autoresearch.tsv` and wait.

## Crash Handling

If the linter crashes (import error, syntax error in `message.mjs`):
- If it is a trivial bug in the change, fix it and re-run (counts as the
  same experiment).
- If the idea is fundamentally broken (e.g. the Deno edge function now
  refuses to import the module), restore and move on.
- Log status `crash` in `results/autoresearch.tsv`.

Optional extra safety net: run the repo tests for the affected surface as
a spot check before committing:

```
npm test -- --testPathPattern=slack 2>/dev/null || true
```

(This is not enforced by the loop, but useful if the agent introduces a
signature change that might break existing Jest tests.)

## End-of-Session Documentation

After the loop ends (time expired or all experiments exhausted):
1. Update the "Current baseline" line at the top with the new best metric.
2. Move tried experiments from the priority list into a "Tried" section
   annotated with `tried: improved +Δ` or `tried: no-improvement`.
3. Refresh the priority list with any new ideas surfaced during the loop.
4. Per AGENTS.md "Documentation Update Rule": if a hardening changed
   user-facing Slack output, note it in `OPERATIONS.md` §"Slack integration".
