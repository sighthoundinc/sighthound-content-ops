# Deterministic Workflow Intelligence Layer (Phase 0)
**Before AI: Build the deterministic core**
## Goal
Create a bulletproof workflow reasoning system that is:
* 100% rule-based
* No AI involved
* Fully testable
* Reusable everywhere (API, hints, validation, notifications)
## Scope (MVP Phase 0)
### Build
1. `src/lib/workflow-rules.ts` — Define all workflow states and transitions
2. `src/lib/blocker-detector.ts` — Identify blockers (missing fields, permissions, ownership)
3. `src/lib/quality-checker.ts` — Detect quality issues (caption length, missing platform, etc.)
4. `src/app/api/ai/utils/context-extractor.ts` — Read entity state from DB
5. `src/app/api/ai/utils/response-generator.ts` — Deterministic output (no AI)
6. `POST /api/ai/assistant` — API endpoint (calls only #1-5)
7. Tests for all above
### NOT Building Yet
* Gemini integration
* UI components
* Async jobs
* Modal/button
* Any AI formatting
## Success Criteria
* ✅ API returns correct responses for 10+ test scenarios
* ✅ Zero AI calls
* ✅ Can run offline
* ✅ 100% test coverage for core logic
* ✅ Ready for review before Gemini layer
## Implementation Order
### Day 1: Rules Engine
1. `workflow-rules.ts` — Define blog, social, idea workflows
2. Tests for rule definitions
### Day 2: Blocker Detection
1. `blocker-detector.ts` — Field checks, permission checks, ownership checks
2. Tests for each blocker type
### Day 3: Quality Checks
1. `quality-checker.ts` — Caption length, platform selection, etc.
2. Tests for quality rules
### Day 4: Context + Response
1. `context-extractor.ts` — Read blog/social/idea from DB
2. `response-generator.ts` — Assemble current state + blockers + next steps
3. Basic unit tests
### Day 5: API Endpoint
1. `POST /api/ai/assistant` — Validate request → extract context → detect blockers → generate response
2. Integration tests
3. Test with real DB data
### Day 6: Validation & Documentation
1. Test 10+ real scenarios (blog draft, social in review, permission denied, etc.)
2. Document rules and outputs
3. Prepare for review
### Day 7: STOP & REVIEW
1. No further implementation
2. User reviews and approves
3. Discussion on Gemini layer (if needed)
## File Structure
```warp-runnable-command
src/lib/
├─ workflow-rules.ts        (state machine definitions)
├─ blocker-detector.ts      (identify blockers)
└─ quality-checker.ts       (detect quality issues)
src/app/api/ai/
├─ utils/
│  ├─ context-extractor.ts  (read entity from DB)
│  └─ response-generator.ts (assemble response)
├─ assistant/
│  └─ route.ts              (POST endpoint)
└─ models.ts                (TypeScript types)
tests/
├─ workflow-rules.test.ts
├─ blocker-detector.test.ts
├─ quality-checker.test.ts
├─ context-extractor.test.ts
└─ assistant-api.test.ts
```
## Example: Blog in Draft, Missing Title
**Input**:
```json
{
  "userId": "user-123",
  "pageType": "blog",
  "entityId": "blog-456"
}
```
**Processing**:
1. Extract context: blog status = "draft", title = null, writer_id = "user-123"
2. Get required fields for draft: ["title", "writer_id"]
3. Detect blockers: title is missing
4. Check permissions: user is writer, can edit
5. Get next stages: ["writer_review"]
6. Generate response
**Output**:
```json
{
  "currentState": "Draft. Writer assigned. Missing title.",
  "blockers": [
    "Title is required"
  ],
  "nextSteps": [
    "Add blog title",
    "Click Submit for Review"
  ],
  "qualityIssues": []
}
```
## No AI in This Phase
**This is deterministic logic only:**
* If status = draft AND title = null → add blocker
* If user.role ≠ publisher AND status = published → add blocker
* If caption.length > platform.max → add quality issue
**Later** (after review):
* Optional: pass response through Gemini formatter
* Optional: UI layer on top
## Validation Checklist
Before Day 7 review:
- [ ] All 3 entity types (blog, social, idea) covered
- [ ] All workflow stages defined
- [ ] All blocker types detected
- [ ] All quality rules checked
- [ ] 10+ test scenarios passing
- [ ] Zero external API calls
- [ ] Can run offline
- [ ] TypeScript strict mode passing
- [ ] Test coverage >90%
## Stop Point
**After Day 7**: Do NOT proceed without explicit approval.
At review, decide:
* Is the deterministic layer correct?
* Do we need Gemini for formatting? (probably not)
* Should we build UI?
* Any changes needed?
