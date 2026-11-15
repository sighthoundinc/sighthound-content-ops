---
target: home dashboard
total_score: 26
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 2
target_identity: "file:/home/user/sighthound-content-ops/src/app/page.tsx"
target_fingerprint: "sha256:0fb839059a3334d5ced72c791361a800f87b155bd10482a07332095d50bcffdb"
target_path: /home/user/sighthound-content-ops/src/app/page.tsx
timestamp: 2026-11-15T19-33-35Z
slug: src-app-page-tsx
---
⚠️ DEGRADED: single-context (sub-agents not used; app not rendered — no Supabase credentials in this environment, source review only)

## Design Health Score — Home (`src/app/page.tsx`)
| # | Heuristic | Score | Key issue |
|---|---|---|---|
| 1 | Visibility of system status | 3 | Load failure has a banner and retry |
| 2 | Match system / real world | 2 | Two different buckets share the title "Awaiting Publishing Review" |
| 3 | User control and freedom | 3 | |
| 4 | Consistency and standards | 2 | Every tile links to /tasks; marketing-size CTA buttons on an app screen |
| 5 | Error prevention | 3 | |
| 6 | Recognition rather than recall | 3 | |
| 7 | Flexibility and efficiency | 3 | |
| 8 | Aesthetic and minimalist design | 2 | Up to 16 tiles, finished work shown as needing attention |
| 9 | Error recovery | 3 | |
| 10 | Help and documentation | 2 | |
| **Total** | | **26/40** | **Acceptable** |

Detector: 0 findings.

## Priority issues
- [P1] Tile count and destination can disagree. Tiles set one status filter on /tasks (`home-bucket-link.tsx`); a blog status filter matches writer and publisher tasks alike and leaves social rows in, and `writer-completed` sets no filter at all. Verify in the running app. Fix: pass type + status and filter on both. Command: harden.
- [P1] Duplicate and unclear tile titles (`home-work-buckets.ts`): publisher `not_started` and `pending_review` are both "Awaiting Publishing Review"; publisher `in_progress` reads "Awaiting Publishing Approval". Command: clarify.
- [P2] Finished work counts as work. "Published" and "Writing Approved" tiles make `hasAnyWork` true, so the hero says "Jump into what needs your attention now" when nothing does. Command: distill.
- [P2] Too many equal-weight tiles; up to six can be rose "high priority" at once, so priority stops meaning anything. Group by Blogs / Social, or show only action-required tiles. Command: distill.
- [P2] Style drift: `cta`-size 20px pill buttons at the bottom of an app page, `rounded-xl` on the error box, `!text-white` overrides in the hero. Command: polish.

## Persona red flags
- Alex (power user): three routes to the same queue (tiles, snapshot, CTA row); tiles are 160px tall for one number.
- Sam (screen reader): tile link text is icon + count + title with no "N items" wording.

## Minor
- `bucket.href` is defined but never used.
- Empty state has no next action.
