---
target: /tasks
total_score: 26
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 2
target_identity: "file:/home/user/sighthound-content-ops/src/app/tasks/page.tsx"
target_fingerprint: "sha256:f20f9471ed8ba46abe9f2fa8a17f989f8bf9e4924a6fa4e3372580356fb18c42"
target_path: /home/user/sighthound-content-ops/src/app/tasks/page.tsx
timestamp: 2026-11-15T19-33-35Z
slug: src-app-tasks-page-tsx
---
⚠️ DEGRADED: single-context (sub-agents not used; app not rendered — no Supabase credentials in this environment, source review only)

## Design Health Score — My Tasks (`src/app/tasks/page.tsx`)
| # | Heuristic | Score | Key issue |
|---|---|---|---|
| 1 | Visibility of system status | 3 | Skeletons, saving alert, load-error state with retry |
| 2 | Match system / real world | 2 | "Task Action State", "Admin Reviews", separate blog and social status filters |
| 3 | User control and freedom | 3 | Clear-all and removable pills; no undo on inline status change |
| 4 | Consistency and standards | 2 | Status column is an editable select on writer rows and a read-only badge elsewhere |
| 5 | Error prevention | 2 | One click on the inline select changes workflow status |
| 6 | Recognition rather than recall | 3 | |
| 7 | Flexibility and efficiency | 4 | Column, density, export, copy, command palette |
| 8 | Aesthetic and minimalist design | 2 | "Next Tasks" card repeats the top rows of the table |
| 9 | Error recovery | 3 | |
| 10 | Help and documentation | 2 | |
| **Total** | | **26/40** | **Acceptable** |

Detector: 0 findings.

## Priority issues
- [P1] Inline status select changes a blog's writer status in one click with no confirm or undo, and only on writer rows. Command: harden.
- [P1] Two status filters (blog "Task Status" always visible, "Social Task Status" hidden under More filters). A home tile for a social status lands here with the controlling filter hidden. Merge into one status control scoped by content type. Command: clarify.
- [P2] "Next Tasks" duplicates the first three table rows and pushes the table down. Drop it or make it the default sort. Command: distill.
- [P2] Row subtitle repeats what the Next Action column says ("Action required by you" / "Waiting on others"). Command: distill.
- [P2] Same copy "No tasks match your current filters." for an empty queue and for over-filtering; shown twice (card and table). Command: onboard.

## Persona red flags
- Alex: filters and page are not in the URL, so opening a task and coming back resets them.
- Sam: inline status select has no accessible name; heading jumps from h1 to h3.

## Minor
- Column ids `writer_status` / `publisher_status` label "Status" / "Next Action".
- Filter selects use `text-navy-500` for the chosen value, so set and unset filters look alike.
