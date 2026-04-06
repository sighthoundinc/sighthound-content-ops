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

## Core pages
- `Dashboard`: cross-content queue and filter view
- `My Tasks`: assignment-first execution queue
- `Blogs`: blog workflow list and details
- `Social Posts`: list/board/calendar and full social editor
- `Ideas`: intake and conversion to blogs/social posts
- `Calendar`: schedule planning and conflict visibility
- `Settings`: profile, timezone, notifications, connected services

## Workflow ownership model
- Work stages are owned by the execution owner
- Review stages are owned by reviewer
- Terminal stages are complete and have no active owner

## Documentation map
- User workflow guide: `HOW_TO_USE_APP.md`
- Technical behavior/spec: `SPECIFICATION.md`
- Maintainer runbook: `OPERATIONS.md`
- Workflow summary brief: `docs/CONTENT_RELAY_DOCUMENTATION_BRIEF.md`

## Local setup
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
