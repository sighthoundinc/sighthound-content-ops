---
target_identity: "file:/home/user/sighthound-content-ops/src/app/page.tsx"
target_fingerprint: "sha256:0fb839059a3334d5ced72c791361a800f87b155bd10482a07332095d50bcffdb"
target_path: /home/user/sighthound-content-ops/src/app/page.tsx
timestamp: 2026-11-15T19-33-35Z
slug: src-app-page-tsx
---
## Audit Health Score — Home (`src/app/page.tsx`), source-only
| # | Dimension | Score | Key finding |
|---|---|---|---|
| 1 | Accessibility | 3 | Tile link names lack "items" wording; contrast not measured (not rendered) |
| 2 | Performance | 3 | Server component fetches its own API over HTTP, uncached, on every visit |
| 3 | Theming | 3 | Tokens used throughout; `!text-white` overrides; no dark mode (by design) |
| 4 | Responsive | 3 | Grid collapses 3 → 2 → 1; not verified at 375px |
| 5 | Implementation integrity | 4 | Detector: 0 findings |
| **Total** | | **16/20** | **Good** |

- [P2] Theming: `page-title !text-white`, `body-text !text-white/70` (lines 61, 73). Add an on-dark variant instead of `!important`.
- [P2] Integrity: `rounded-xl` error box (line 84) where the system uses `rounded-lg`; CTA-size buttons (lines 236-247) on an app surface.
- [P3] Performance: two internal HTTP round trips per render (`home-data.ts`).
- Positive: failed load never reads as "all caught up"; role="alert" on the error; server-rendered with one small client island.
