# Performance Budget
This document codifies the UX performance contract for Content Relay. It mirrors the client-side marks in `src/lib/perf-marks.ts` and the targets reviewed in the UI/UX upgrade plan.
## Budgets (p75)
| Surface | Mark key | Target | Hard ceiling |
| --- | --- | --- | --- |
| Dashboard first meaningful render | `dashboard:tti` | 1000 ms | 1600 ms |
| My Tasks first meaningful render | `tasks:tti` | 1000 ms | 1600 ms |
| List filter response (debounced input → rendered rows) | `list:filter` | 100 ms | 250 ms |
| Drawer open (click → visible panel) | `drawer:open` | 150 ms | 300 ms |
| Command palette first result | `palette:first-result` | 250 ms | 500 ms |
`list:filter` excludes the 180ms input debounce defined in `AGENTS.md`; it measures the work done after the debounced value changes.
## Instrumentation
- Wrap the critical path with `markStart(key)` early in mount and `markEnd(key)` on first meaningful render.
- In development, any mark exceeding its budget emits a `console.warn`. Production emissions are a no-op unless wired to a telemetry sink.
- Do NOT add per-component instrumentation. Keep marks at the surface granularity listed above.
## Validation
- Local: Lighthouse lab runs on dashboard, tasks, social-post editor at 1280x800 with Fast 3G throttled.
- CI: `.github/workflows/lhci.yml` runs Lighthouse CI against the three surfaces above on every PR. Regressions beyond the hard ceiling must block merge.
- Field: Web Vitals (`LCP`, `INP`, `CLS`) collected by the existing auth/analytics pipeline.
## Regression policy
- A single surface exceeding the target by ≤15% is acceptable for two consecutive PRs; after that, the regression owner must file a perf task.
- Any regression past the hard ceiling blocks merge unless the PR owner documents the root cause and a remediation window in the PR description.
## Related
- `src/lib/perf-marks.ts`
- `src/lib/optimistic.ts` (optimistic UI eliminates most list/form spinners)
- `src/components/skeleton.tsx` (skeleton rows replace blocking spinners)
