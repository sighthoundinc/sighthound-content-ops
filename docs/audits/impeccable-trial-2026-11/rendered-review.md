# Rendered review — production, 2026-11-15

Signed in to production (build `b3d0c74`, before the fixes on this branch) with an admin test account. Read-only: nothing was created, edited, or deleted. The one write was dismissing the onboarding tour for the test account.

**Coverage.** 11 routes at 1440px and 390px (home, My Tasks, Dashboard, Blogs, Social Posts, Calendar, Ideas, Inbox, Settings, User Manual, Activity History), plus CardBoard, Permissions, a blog detail page, the dashboard blog drawer, command palette, Ask AI panel, mobile menu, and the 404 page. Each route: screenshot, console errors, failed requests, horizontal overflow, heading order, small targets, axe-core (WCAG 2 A/AA, 2.2 AA).

**Not covered.** The fixes on this branch were not rendered (branch previews sit behind Vercel sign-in). The test account has no assigned tasks, so home tiles and a populated My Tasks were not seen. No social post detail page, no create/edit flows, no non-admin role.

## Clean results

- No horizontal page overflow on any route at 390px.
- No console errors on the 11 main routes; all page titles unique; custom 404 present.
- Keyboard: skip link first, visible focus ring on every header control, Esc closes the palette and drawer.
- axe: zero violations on 9 of 11 routes.

## Fixed on this branch

| # | Finding | Where |
|---|---|---|
| 1 | Blog drawer's "Associated Social Posts" called an API route that does not exist (404 on every open) and showed "No associated social posts" | `src/components/associated-social-posts-section.tsx` |
| 2 | Social Posts list had no Title column; rows with the same product and status were indistinguishable and had no link | `src/app/social-posts/page.tsx` |
| 3 | Activity history title-cased URLs and replaced underscores (`Https://Drive.Google.Com/… 3PX8…`) | `src/lib/activity-history-format.ts` |
| 4 | Activity history read "Assigned to: Assigned to Haris" | same |
| 5 | Drawer and blog page used "Workflow & Assignments", "Writer status", "Writer Workflow", "Save Writer Updates"; `AGENTS.md` requires "Content Workflow" and Writing / Publishing | drawer, `blogs/[id]`, `blogs`, `dashboard` |
| 6 | Dashboard Lifecycle column showed lowercase raw values ("published") | `src/components/dashboard-table.tsx` |
| 7 | Ideas: solid red Delete was the first and loudest button on every card | `src/app/ideas/page.tsx` |
| 8 | Calendar: out-of-month day numbers failed contrast (axe, 6 nodes) | `src/components/calendar-tile.tsx` |
| 9 | Blog drawer header showed four unlabelled status chips ("Published, Published, Writing Approved, Published"); now one labelled chip each for Writing and Publishing | `dashboard`, `blogs` |
| 10 | Blog detail stage selects showed raw "Completed"; now the canonical labels | `blogs/[id]` |
| 11 | Ideas page title was "Blog Ideas" at a larger size than other pages; now "Ideas" in the shared title style | `ideas` |
| 12 | Settings showed the role as lowercase "admin" | `settings` |
| 13 | User Manual tables: scroll regions were not keyboard focusable (axe) | `resources` |
| 14 | "Export to Calendar" had no gap between icon and text | `calendar` |

## Open

| Sev | Finding |
|---|---|
| P2 | Activity history logs one change twice ("Status Updated" and "Published" at the same minute) and attributes everything to "System". |
| P2 | Blog detail has three separate save buttons (metadata, writing, publishing). |
| P2 | Onboarding tour card stays over the bottom-right of every page until dismissed and covers table actions and filters. |
| P2 | Dashboard filter row: the Lens select has a label above it, so it sits 20px lower than the other four filters. |
| P2 | Mobile calendar opens on the 7-column month grid, which scrolls sideways; the scroll region is not keyboard focusable (axe). Stream view fits better. |
| P2 | Mobile tables (Social Posts, Dashboard) need sideways scrolling to reach key columns. |
| P2 | Filter vocabulary differs by page: "All Authors / All Websites" on CardBoard, "Assigned to / Site" elsewhere. CardBoard cards label status chips "Writer:" / "Publisher:". |
| P3 | Header content is capped at 1280px while the page is full width, so the header's right edge and logo do not line up with the content at 1440px. |
| P3 | Command palette: nav item is "My Tasks" but the palette says "Tasks". (The lone "Shortcut" footer link is intentional per `AGENTS.md`.) |
| P3 | Calendar month view shows a "+" button in all 35 day cells. |

Checked and not a defect: the Ask AI panel's serifed capital "I" is Lexend's own glyph, not a fallback font.

## Follow-up, same day (production build `6a6c240` and later)

Created two throwaway blogs assigned to the test account (`Test: Claude audit blog A` and `B`) to exercise home and My Tasks.

Verified rendered: home tile count matches the filtered My Tasks list (2 items, pills for task type, content, and status); Undo reverts an inline status change; dashboard filters share one baseline; header lines up with the content edge; Lifecycle values are capitalised; palette says "My Tasks"; CardBoard uses "All Sites" and Writing / Publishing chip labels.

New findings:

| Sev | Finding | State |
|---|---|---|
| P2 | Home snapshot showed dates as raw `2026-11-15` | Fixed |
| P2 | Home tiles lag up to 30 seconds behind the snapshot list after a change (summary is cached server-side, snapshot is not), so the page can show tasks with no tiles | Open |
| P2 | Mobile calendar: Stream view is also a seven-column grid, so defaulting phones to it does not help (tried, reverted). Needs a single-column agenda view | Open |
