# sighthound-content-ops
Content Relay is a stage-based content operations app for managing blogs and social posts from intake to publication.

## What this app does
- Runs two delivery tracks: **Blogs** and **Social Posts**
- Enforces workflow stages and required-field gates
- Keeps ownership explicit so each record has a clear next actor
- Provides queue-first execution through `My Tasks`, `Dashboard`, and `Calendar`

## Pipeline overview
### Blog track
Not Started → Writing in Progress → Awaiting Writing Review → (Needs Revision ↔ Awaiting Writing Review) → Writing Approved → Publishing in Progress → Awaiting Publishing Review → Approved for Publishing → Published
- If Actual Published Date is blank, it is automatically captured when publishing is marked completed.
- Role nouns (`Writer`, `Publisher`, `Reviewer`) appear only when labeling a specific user acting in that role; stages/statuses use pipeline nouns (`Writing`, `Publishing`).

### Social track
Draft → In Review → Changes Requested → Creative Approved → Ready to Publish → Awaiting Live Link → Published

Social post create contract:
- Required at create: Product, Type, Assigned to, Reviewer
- Optional at create: Title, Platforms, Scheduled date, Associated blog
- Empty create title is normalized to `Untitled social post`

### Final gate
Social posts must include at least one valid public live link before they can move to `Published`.

## Daily usage pattern
1. Open `My Tasks`
2. Execute items in `Required by me`
3. Complete required fields/checklists
4. Move status forward only when gates are satisfied
5. Monitor `Waiting on Others` for handoff blockers
- Home standup cards and `My Tasks Snapshot` use the same assignment/action-state model, so actionable review assignments (including admin review assignments) stay aligned across both surfaces.
- When a user has multiple associations on the same blog, the selected card/snapshot classification prioritizes actionable work (`Required by me`) over waiting states.
- Social ownership classification on home/snapshot reads current assignee ownership first and falls back safely to legacy owner columns when needed.
- Dashboard overview social metrics also use ownership fallback behavior so social counts stay visible during temporary schema-cache drift.
- Dashboard summary/snapshot/overview APIs use short-lived per-user caching (30s) to reduce repeated query load during frequent page switching.
- Dashboard and Social Posts list search use a short debounce (`180ms`) so filtering remains responsive while typing.

## Core pages
- `Dashboard`: cross-content queue and filter view, with overview cards loaded from server aggregation (`/api/dashboard/overview-metrics`)
  - overview/summary/snapshot endpoints return private short-lived cached responses (`Cache-Control` with 30s max-age + stale-while-revalidate) for smoother navigation
  - Lens options use a fixed triage order: `All Work` → `Needs My Action` → `Awaiting Review` → `Ready to Publish` → `Awaiting Live Link` → `Published Last 7 Days` (default lens: `All Work`)
  - Filter options show contextual counts so users can estimate impact before toggling a facet.
  - `Lens shortcuts` let users save and reapply frequently used lens selections with one click.
- `My Tasks`: assignment-first execution queue served by unified API (`/api/tasks/queue`)
  - advanced filters under `More filters` with scope-aware blog/social controls
- `Inbox` (`/inbox`): read-only aggregate of `Required`, `Waiting`, and recent `Activity` across blogs and social posts. Reads from the same snapshot + activity-feed endpoints the dashboard uses, so counts stay aligned. Archive/snooze are not yet available.
- `Blogs`: blog workflow list and details
- `Social Posts`: list/board/calendar and full social editor
  - list bulk delete runs selected requests concurrently and returns one aggregated deleted/skipped/failed summary
- `Ideas`: intake and conversion to blogs/social posts
- `Calendar`: schedule planning and conflict visibility
  - top controls follow one hierarchy: sticky grouped `Prev/Today/Next` + month picker popover + `Month/Week`, then a compact secondary strip
  - a compact `Today · <date>` chip appears next to month selection for orientation
  - secondary strip uses neutral labels (`View`, content toggles, `Assigned to`) and avoids role-heavy wording
  - top controls use one outer container with lighter internal separation (lower border density)
  - active filter-pill row only renders when filters are active (no empty placeholder row)
  - `This Week` summary metrics card is removed and day header count badges are hidden to reduce visual clutter
  - month mode includes a subtle current-week background band for orientation
  - event cards use one metadata line by default (extra context in tooltip)
  - unscheduled empty states use quiet one-line muted messages
  - overview table includes previous/current/next-month scheduled items with normalized status pills across blog/social rows
  - unscheduled cards with zero count are passive (no expand chevron)
- `Settings`: profile, timezone, notifications, connected services

## Ask AI workflow helper
- Ask AI is guidance-only: it explains current workflow state, answers factual questions, and never changes data.
- `POST /api/ai/assistant` accepts an optional `prompt` (natural-language question) and optional `userTimezone`.
- Gemini-primary interpretation (default model `gemini-2.5-flash`, override via `GEMINI_MODEL`) with deterministic fallback; `ASK_AI_REQUIRE_GEMINI=true` locks it to Gemini-only in dev/staging.
- Workflow questions (“Why can’t I publish?”) return humanized blockers and next steps.
- Factual questions (“What is the title?”, “Who wrote this?”, “When was this published?”) read strictly from grounded RAG metadata loaded from the DB under the caller’s RLS — covers blogs, social posts, and ideas. Missing facts are disclosed, never invented.
- Ideas are intake-only: Ask AI never shows workflow blockers on an idea.
- Dates render in the user’s timezone (`profiles.timezone`) with `America/New_York` fallback.
- Response metadata includes:
  - `questionIntent` (workflow intents plus factual intents `identity`, `people`, `timeline`),
  - `answer`,
  - `responseSource` (`gemini` when Gemini is available, otherwise `deterministic` fallback),
  - optional `aiModel` when Gemini is used.
- In-panel UX: context-aware quick prompts, **Ask another question** button, Retry on error (replays last prompt), panel clears on navigation, confidence meter hidden for factual/Gemini answers.

Detail page ordering rule:
- Blogs: `Comments` → `Links` → `Assignment & Changes`.
- Social Posts: `Setup` → `Assignment` → `Associated Blog` → `Write Caption` → `Review & Publish` → `Comments` → `Current Snapshot` → `Checklist` → `Assignment & Changes`.
- On social post surfaces, use `Assignment & Changes` instead of `Activity`.
- Social workflow labels, next-action copy, and transition mappings in `src/lib/status.ts` are centralized from `src/lib/social-post-workflow.ts` and guarded by `src/lib/social-post-workflow.contract.test.ts`.
- Both detail pages include:
  - top `Next Action` strip (primary CTA + owner handoff context + preflight)
  - `Jump to` section navigator
  - explicit save-state indicator (`Unsaved changes` / `All changes saved`)
- Responsive detail layout:
  - `lg`+ screens show a sticky right rail for high-priority workflow controls.
  - Smaller screens stack those controls into the main content flow for consistent readability.

## Workflow ownership model
- Work stages are owned by the execution owner
- Review stages are owned by reviewer
- Terminal stages are complete and have no active owner

## Timezone display contract
- User-facing date/time/timestamp values render in the logged-in user’s selected timezone (`profiles.timezone`).
- Fallback timezone is `America/New_York` when a user timezone is not set.
- Comments, timelines, and record history follow the same user-timezone rule.
- Exception: admin Activity History in Settings may display UTC for cross-user operational consistency.

## Slack workflow alerts
- Workflow Slack notifications are posted to `#content-ops-alerts`.
- `Open link:` deep links are generated server-side from canonical content IDs and use resilient app URL fallback (`NEXT_PUBLIC_APP_URL` → `APP_URL` → `https://sighthound-content-ops.vercel.app`).
- Slack delivery keeps links clickable while suppressing previews (`unfurl_links: false`, `unfurl_media: false`) for both bot-token and webhook paths.
- Blog and social comment creation also posts to Slack with `Action: New comment`, `By: <name>`, and full multi-line comment text.
- Comment notifications preserve line breaks and neutralize Slack ping tokens to avoid accidental channel/user pings.

## Documentation map
- User workflow guide: `HOW_TO_USE_APP.md`
- Technical behavior/spec: `SPECIFICATION.md`
- Maintainer runbook: `OPERATIONS.md`
- Workflow summary brief: `docs/CONTENT_RELAY_DOCUMENTATION_BRIEF.md`
- UX upgrade rollout + primitive adoption: `docs/UX_UPGRADE_PLAN.md`
- Design tokens reference: `docs/DESIGN_TOKENS.md`
- Performance budgets: `docs/PERFORMANCE_BUDGET.md`
- Bundle-size autoresearch tool: `autoresearch/README.md` (runbook in `OPERATIONS.md` §12)
## Home page rendering
- `/` is a Server Component. Dashboard summary + tasks snapshot are fetched server-side via `@supabase/ssr` cookies before the initial HTML is returned.
- Only the bucket tile `onClick` (filter intent) lives in a client component (`src/app/home-bucket-link.tsx`); everything else on `/` is server-rendered.
- Contract + constraints: `SPECIFICATION.md` §15.
## Authentication
- Three-layer model: edge middleware (`src/middleware.ts`), Server Components (`/`, `/login`) using `src/lib/supabase/ssr.ts`, and client state (`src/providers/auth-provider.tsx`) using `src/lib/supabase/browser.ts`.
- `/login` is a Server Component. Already-signed-in users are redirected server-side (`/` or `/settings` based on `?reconnect`); the `LoginForm` client island navigates after interactive password sign-in and carries a session-watching `useEffect` as the safety net for the OAuth return chain.
- Full contract: `SPECIFICATION.md` §16. Troubleshooting runbook: `OPERATIONS.md` §13.

## Local setup
Prerequisite:
- Node.js `20.x`
1. Install dependencies
```bash
npm install
```
2. Create local environment file
```bash
cp .env.example .env.local
```
Optional:
- Set `GEMINI_API_KEY` in `.env.local` to enable Gemini prompt interpretation for Ask AI.
3. Start the app
```bash
npm run dev
```

## Validation
```bash
npm run lint
npm run typecheck
npm run check
npm run check:full
```

## Migration note
- Task/dashboard performance relies on composite indexes introduced for ownership/status-heavy query paths (social posts, blogs, and task assignments). Apply latest Supabase migrations before validating queue/summary performance.
- Legacy compatibility endpoint `DELETE /api/ideas/[id]/delete` is retired (`410 Gone`). Use `DELETE /api/ideas/[id]`.
