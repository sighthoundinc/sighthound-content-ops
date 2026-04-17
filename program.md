# Slack Contract AutoResearch

## Goal

**Maximise `slack_contract_pass` on the Slack notification fixture set.**

Current baseline: **`slack_contract_pass = 1.0000`** (Round 2 closed; Round 3
will add new aspirational rules and re-baseline).

Round history:
- **Round 1 (closed)**: 0.9657 → 1.0000. Four experiments: title trim,
  case-insensitive assignee dedupe, site canonicalization (SH/RED), HTML-escape
  angle brackets in the header title.
- **Round 2 (closed)**: 0.7714 → 1.0000. Two experiments: Slack angle-bracket
  link syntax (`<URL|label>`) and per-event CTA labels (`Open blog` / `Open post`
  / `Open thread` / `Submit link`). Closed the "Open link doesn't actually
  open" regression surfaced by the deep dive.
- **Round 3 (proposed)**: see §Experiment Priorities below. Targets title
  length capping, overdue event emphasis, deep-link URL encoding, and
  emitter-side robustness. Widens `EDITABLE_FILES` to include overdue/reminder
  routes so the loop can close caller-side bugs H3/H4.

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

## Experiment Priorities (Round 3 — proposed)

Round 3 has not started yet. Before kicking it off, extend
`eval/slack/fixtures.mjs` and `eval/slack/rules.mjs` with the aspirational
checks listed below, then commit the harness additions as the Round 3
baseline. The loop then ratchets `message.mjs`, `index.ts`,
`server-slack-emitter.ts`, and (new in Round 3) the overdue/reminder API
routes to close each failure.

Experiments are ordered by expected impact. Fixture/rule names are the
suggested identifiers — rename as needed when implementing the harness
additions.

1. **Fix `site` overloading for social events (H3 — caller bug).**
   New fixtures: `social_site_resolves_from_linked_blog`,
   `social_site_defaults_to_SH_when_no_blog`. New rule:
   `social_site_never_contains_product_slug` (weight 5). The rule checks
   the header site never matches known product slugs (`platform`,
   `edge_vision`, `general_company`, etc.). Requires widening
   `EDITABLE_FILES` to include `src/app/api/social-posts/reminders/route.ts`
   and `src/app/api/social-posts/overdue-checks/route.ts`. The fix: derive
   `site` from the social post's linked blog when available, fall back to
   `"SH"` otherwise — never a product slug.

2. **Populate `reviewer_user_id` in the social overdue-checks SELECT (H4).**
   New fixture: `social_review_overdue_surfaces_reviewer_name`. New rule:
   `social_review_overdue_has_named_assignee` (weight 3) — for
   `social_review_overdue` events the `Assigned to:` value must not be
   `"Team"` when the fixture provides a `reviewerName`. Requires adding
   `reviewer_user_id` to the SELECT in
   `src/app/api/social-posts/overdue-checks/route.ts:52–58` and plumbing
   it through the emitter call.

3. **Title length cap with ellipsis (defensive hardening).**
   New fixture: `title_exceeding_200_chars_is_truncated`. New rule:
   `title_length_cap` (weight 2) — header line ≤ 240 chars and, when
   truncated, ends with `…` inside the header. Fix: extend
   `normalizeTitle()` to cap at 180 chars with ellipsis; keep the rest
   of the contract (trim, escape) intact.

4. **Distinct CTA marker for overdue events.**
   New fixture: `overdue_events_carry_overdue_marker`. New rule:
   `overdue_cta_label_is_marked` (weight 2) — for the 3 overdue event
   types, the CTA label must end with ` (overdue)`. Fix: thread an
   `isOverdue(eventType)` check through `ctaLabelFor()` so overdue events
   render as `Open blog (overdue)` / `Open post (overdue)` without
   breaking the Round 2 base labels.

5. **URL encoding for deep-link IDs.**
   New fixture: `deep_link_id_containing_special_chars_is_encoded`. New
   rule: `deep_link_is_url_safe` (weight 2) — the URL inside `<URL|label>`
   passes a strict `URL` constructor parse on the fixture `socialPostId`
   / `blogId` value after decoding. Fix: run IDs through
   `encodeURIComponent` in `buildDeepLink()` as a defensive pass.

6. **Emitter-side pre-validation + dedupe of `targetUserIds` (M2).**
   No new rule — maintenance work to reduce DB lookups and surface caller
   bugs earlier. Emitter should warn on empty `title`/`site`, dedupe
   `targetUserIds` before the profile fetch, and log the payload shape
   on a 400 response from the edge function.

7. **Migrate edge function to `Deno.serve()` (L1).**
   Drop the deprecated `std@0.224.0/http/server` import; adopt
   `Deno.serve()` signature. No metric impact; eliminates cold-start
   deprecation warnings.

### Pre-Round-3 harness checklist (do BEFORE starting the loop)

1. Add the 5 new fixtures listed above to `eval/slack/fixtures.mjs`.
2. Add the 4 new rules listed above to `eval/slack/rules.mjs` (experiments
   6 and 7 don't need rules).
3. Widen `EDITABLE_FILES` in `research.env` to include the 2 overdue/
   reminder route files.
4. Re-run `node scripts/slack-contract-lint.mjs --verbose` to measure the
   new baseline (expected: somewhere in the 0.85–0.90 range).
5. Pin the new baseline in `research.env` (`BASELINE_METRIC="<measured>"`).
6. Commit as `chore(autoresearch): round 3 baseline`.
7. Start a fresh session: `./scripts/start-session.sh 2 <baseline>`.

### History of closed experiments

Round 1 (0.9657 → 1.0000):
- R1-1 — trim title whitespace (+0.0069) — `d11a947`
- R1-2 — case-insensitive assignee dedupe (+0.0055) — `855f400`
- R1-3 — canonicalize site to SH/RED (+0.0137) — `b0b0520`
- R1-4 — HTML-escape angle brackets in header title (+0.0068) — `f064805`

Round 2 (0.7714 → 1.0000):
- R2-1 — wrap Open link URL in Slack angle-bracket syntax (+0.1429) — `ee501a1`
- R2-2 — per-event CTA labels via `ctaLabelFor` helper (+0.0857) — `7e67f17`

## Simplicity Criterion

- Improvement < `MIN_DELTA` (currently 0.005) → discard even if positive.
- A fix that requires editing more than ~30 lines to move the metric by
  <0.02 is over-engineered.
- A fix that deletes code or simplifies an existing helper is ALWAYS worth
  keeping.

## Agent Workflow (Copy-Paste Prompt)

Use this prompt to start a session (Prompt 2 from the AutoResearch README).
Replace `<baseline>` with the measured baseline after completing the Round 3
harness checklist above.

```
Run the autoresearch loop for [N] hours. Follow program.md §Agent Workflow exactly:
1. Start the session: ./scripts/start-session.sh [N] <baseline>
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
