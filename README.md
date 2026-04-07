# sighthound-content-ops
Content Relay is a stage-based content operations app for managing blogs and social posts from intake to publication.

## What this app does
- Runs two delivery tracks: **Blogs** and **Social Posts**
- Enforces workflow stages and required-field gates
- Keeps ownership explicit so each record has a clear next actor
- Provides queue-first execution through `My Tasks`, `Dashboard`, and `Calendar`

## Pipeline overview
### Blog track
Writing flow → Writing Approved handoff → Publishing in Progress → Awaiting Publishing Approval → Publishing Approved → Published
- If Actual Published Date is blank, it is automatically captured when publishing is marked completed.

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

## Core pages
- `Dashboard`: cross-content queue and filter view
- `My Tasks`: assignment-first execution queue
- `Blogs`: blog workflow list and details
- `Social Posts`: list/board/calendar and full social editor
- `Ideas`: intake and conversion to blogs/social posts
- `Calendar`: schedule planning and conflict visibility
- `Settings`: profile, timezone, notifications, connected services

Detail page ordering rule:
- Blogs: `Comments` → `Links` → `Assignment & Changes`.
- Social Posts: `Setup` → `Assignment` → `Associated Blog` → `Write Caption` → `Review & Publish` → `Comments` → `Current Snapshot` → `Checklist` → `Assignment & Changes`.
- On social post surfaces, use `Assignment & Changes` instead of `Activity`.
- Both detail pages include:
  - top `Next Action` strip (primary CTA + owner handoff context + preflight)
  - `Jump to` section navigator
  - explicit save-state indicator (`Unsaved changes` / `All changes saved`)
- Responsive detail layout:
  - `xl`+ screens show a sticky right rail for high-priority workflow controls.
  - Smaller screens stack those controls into the main content flow for consistent readability.

## Workflow ownership model
- Work stages are owned by the execution owner
- Review stages are owned by reviewer
- Terminal stages are complete and have no active owner

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
