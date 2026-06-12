# Archive

Point-in-time historical records (sprint reports, phase completions, audit
snapshots, fix logs). These documents are **not** maintained and do not
describe current behavior. Canonical, living documentation lives at the repo
root (`README.md`, `SPECIFICATION.md`, `AGENTS.md`, `HOW_TO_USE_APP.md`,
`OPERATIONS.md`) and in `docs/`.

Logical groups:

- **Sprints** — `SPRINT_1_*`, `SPRINT_2_*`
- **Phases** — `PHASE_0_COMPLETE.md`, `PHASE_2_COMPLETION_REPORT.md`,
  `PHASE_C_COMPLETION.md`, `PHASE_E_COMPLETION.md`,
  `phase-0-deterministic-workflow-intelligence.md`,
  `PROJECT_COMPLETION_SUMMARY.md`, `IMPLEMENTATION_SUMMARY.md`,
  `FEATURE_DELIVERY_SUMMARY.txt`, `MERGE_READY.md`
- **Governance** — `GOVERNANCE_*`
- **Audits & verification** — `AUDIT_RESULTS.md`, `CODEBASE_AUDIT_REPORT.md`,
  `FINAL_AUDIT_SUMMARY.txt`, `FINAL_VERIFICATION_REPORT.md`,
  `BUILD_VERIFICATION.md`, `SUPABASE_INTEGRATION_VALIDATION.md`,
  `HIGH_PRIORITY_TRIAGE.md`, `VERIFICATION_ERROR_FIXES.md`
- **Fix logs** — `COMPLETE_ERROR_FIX_SUMMARY.md`,
  `FIXES_ERROR_MESSAGE_EXPOSURE.md`, `CLEANUP_SUMMARY.md`, `CLEANUP_TODO.md`
- **AI assistant history** — `AI_ASSISTANT_*`, `AI_PRACTICAL_USE_CASES.md`,
  `ai-assistant-mvp-spec.md`, `ai-assistant-premium-ux-upgrade.md`
- **Design history** — `TASKS_PAGE_DESIGN.md`, `TASK_ASSIGNMENT_DESIGN_REVIEW.md`,
  `TYPOGRAPHY_MODERNIZATION_SUMMARY.md`, `TYPOGRAPHY_REFINEMENTS.md`,
  `ACTIVITY_HISTORY_UX_GUIDE.md`, `TESTING_ROADMAP.md`

Convention: when a status/completion/audit report stops being actionable,
move it here (flat, `git mv`) instead of leaving it at the repo root.
