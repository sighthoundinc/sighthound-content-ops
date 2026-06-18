# Production Component Map

This map translates design-system concepts and UI-kit references into production Content Relay implementation surfaces.

## Core primitives

| Design concept | Production source | Notes |
|---|---|---|
| Button | `src/components/button.tsx` | Use `Button` or `buttonClass()`. Do not re-inline button chrome. |
| Icon | `src/lib/icons.tsx` | Use `AppIcon` / `AppIconName`. Do not copy inline SVG paths from UI kits. |
| Tooltip | `src/components/tooltip.tsx` and `.tooltip-bubble` in `src/app/globals.css` | Tooltip z-index must stay below modal/toast layers. |
| Confirmation dialog | `src/components/confirmation-modal.tsx` | Required for destructive confirmations. Do not use `window.confirm()`. |
| Detail drawer | `src/components/detail-drawer.tsx` | Shared drawer family for record details. |
| Skeleton/loading | `src/components/skeleton.tsx` and `.skeleton` in `src/app/globals.css` | Respects reduced-motion behavior. |
| Card | `src/components/card.tsx` | General-purpose post-migration card primitive. |
| Badge | `src/components/badge.tsx` | General-purpose badge; workflow status chips remain separate. |
| Link quick actions | `src/components/link-quick-actions.tsx` | Use for useful workflow URLs with Open and Copy actions. |
| Table controls | `src/components/table-controls.tsx` | Results summary, pagination, row-limit controls. |
| Bulk selection | `src/hooks/useBulkSelection.ts` and `src/components/bulk/selection-cart.tsx` | Use for operational tables. |
| Empty state | `src/components/empty-state.tsx` | Copy should come from `UI_VOCAB.emptyStates` where possible. |

## Token and typography mapping

| Design concept | Production source | Notes |
|---|---|---|
| Brand tokens | `design-system/colors_and_type.css` → `src/app/globals.css` | Token changes originate in the design system and flow downstream. |
| Tailwind v4 utilities | `@theme inline` in `src/app/globals.css` | This repo does not use `tailwind.config.*`. |
| App font | `src/app/layout.tsx` | Lexend via `next/font/google`; JetBrains Mono for technical values. |
| Typography utilities | `src/app/globals.css` and `src/lib/typography.ts` | App density remains 14px / 400. |
| Motion tokens | `src/lib/motion.ts` and `src/app/globals.css` | Reduced motion collapses durations to zero. |
| PDF/export brand tokens | `src/lib/print-brand-tokens.ts` and `src/lib/pdf-export.ts` | Detached print windows may need explicit values because CSS vars do not cross document boundaries. |

## Workflow and semantic indicators

| Design concept | Production source | Notes |
|---|---|---|
| Blog/social status labels | `src/lib/status.ts` and `src/lib/social-post-workflow.ts` | Do not change enum keys or persisted values for display-only work. |
| Status chip colors | `src/lib/status.ts` and `src/lib/table-row-tones.ts` | Semantic palette is intentionally retained. |
| Next action labels | `src/lib/next-action.ts` | Avoid page-specific action labels. |
| Preflight readiness | `src/lib/preflight.ts` and `src/components/next-action/` | Required-field reporting should stay centralized. |
| UI vocabulary | `src/lib/ui-vocab.ts` | Single source for user-facing terminology and forbidden strings. |

## Layout and shell mapping

| Design concept | Production source | Notes |
|---|---|---|
| App shell/sidebar | `src/components/app-shell.tsx` | Content Relay sidebar remains white. Redactor navy sidebar is reference-only. |
| Sidebar toggle | `src/components/sidebar-toggle.tsx` | Must preserve tooltip and collapsed alignment behavior. |
| Sidebar footer/version | `src/components/sidebar-version-footer.tsx` | Hidden when collapsed. |
| Dashboard sidebar filters | `src/components/dashboard-sidebar.tsx` | Writer and Publisher filters retain independent toggle state. |
| Calendar shell | `src/components/calendar-shell.tsx` and `src/components/calendar-stream.tsx` | Month/week/social calendar parity should remain shared. |

## AI assistant mapping

| Design concept | Production source | Notes |
|---|---|---|
| Floating assistant | `src/components/ai/ai-floating-assistant.tsx` | Visible only where Ask AI can help. |
| Chat panel | `src/components/ai/ai-chat-panel.tsx` | Advisory-only. No mutation or content generation. |
| Message rendering | `src/components/ai/ai-message.tsx` | Factual answers must stay grounded in API facts. |
| Based-on panel | `src/components/ai/based-on-panel.tsx` | Explains grounded facts and links. |
| Feedback | `src/components/ai/ai-feedback.tsx` | Sends thumbs feedback through API. |

## Reference-only design-system artifacts

These are useful for direction but must not be imported directly into `src/`:

- `design-system/ui_kits/sighthound-marketing/`
- `design-system/ui_kits/redactor-app/`
- `design-system/ui_kits/alpr-app/`
- `design-system/ui_kits/video-app/`
- `design-system/Sighthound Redactor App.html`
- `design-system/Sighthound Video App.html`
- `design-system/_ds_bundle.js`

When a UI-kit pattern is promoted to production, reimplement it through the production sources above and run `npm run check:design-system`.
