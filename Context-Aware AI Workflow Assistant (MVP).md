# Context-Aware AI Workflow Assistant
**MVP: A guidance-only AI helper for self-explaining software**
## Philosophy
AI guides, not executes. Users ask "What do I do next?" and get precise, context-aware answers based on their exact situation (page, status, role, blockers). No content generation, no automation, no state changes.
## Success Criteria
* User clicks "Ask AI" on a blog/social/idea
* AI returns clear, structured guidance in <2 seconds
* Guidance answers: current state, blockers, next steps
* No generic responses; all answers are contextual
* Zero risk (AI only reads, never writes)
***
## Phase 1: Foundation (1 week)
### 1.1 Backend Context Layer
**Task**: Build `/api/ai/assistant` endpoint with structured context extraction
**What it does**:
* Accepts POST request with `userId`, `pageType`, `entityId`, `userQuestion`
* Fetches entity (blog/social/idea) from DB
* Validates user has read access (via RLS check)
* Extracts structured metadata (status, fields, permissions, blockers)
* Returns context without full content
**Implementation**:
```warp-runnable-command
src/app/api/ai/
├─ assistant/
│  └─ route.ts (POST handler)
├─ utils/
│  ├─ context-extractor.ts (extract blog/social/idea context)
│  ├─ blocker-detector.ts (identify missing fields, permission issues)
│  ├─ gemini-client.ts (call Gemini API)
│  └─ prompt-builder.ts (build structured prompts)
└─ models.ts (TypeScript types)
```
**Database checks required**:
* User has read permission for entity (RLS enforced)
* Entity exists and is accessible
* Extract: status, assigned users, required fields, current ownership
**No changes to existing tables** (read-only queries)
### 1.2 Blocker Detection Engine
**Task**: Identify why a user can't proceed
**Blockers to detect**:
* Missing required fields (for current stage)
* User is not assigned/owner for next stage
* Transition not allowed from current status
* Blog missing writer/publisher assignment
* Social post missing platforms, caption, etc.
**Output format**:
```typescript
interface BlockerResult {
  blockers: [
    { field: "caption", type: "missing_field", severity: "critical" },
    { field: "platforms", type: "missing_field", severity: "critical" },
    { permission: "reviewer", type: "permission_denied", severity: "blocking" }
  ];
  canProceed: boolean;
  nextAllowedTransition?: string;
}
```
### 1.3 Gemini Integration
**Task**: Call Gemini API with structured context prompt
**Prompt template** (system instruction):
```warp-runnable-command
You are a workflow assistant for a content operations system.
You help users understand their current situation and next steps.
DO:
- Explain current stage clearly
- List missing required fields (if any)
- Explain permission/ownership blockers
- Suggest next steps in bullet points
- Be concise (max 150 words)
DO NOT:
- Generate content (captions, blogs, titles)
- Suggest workarounds that bypass the system
- Give vague generic advice
- Make assumptions about user intent
Respond in structured JSON:
{
  "currentState": "...",
  "blockers": ["..."],
  "nextSteps": ["..."]
}
```
**No caching or cost tracking yet** (keep MVP simple)
### 1.4 Response Format
**Task**: Normalize Gemini output to structured, actionable format
**Output schema** (Zod validation):
```typescript
const assistantResponseSchema = z.object({
  currentState: z.string().max(200),
  blockers: z.array(z.string()).max(5),
  nextSteps: z.array(z.string()).max(5),
  confidence: z.number().min(0).max(100)
});
```
**Fallback responses** (for Gemini failures):
* If API down: "AI assistant is temporarily unavailable. Try again in 30 seconds."
* If validation fails: "Could not understand your request. Try: 'What do I do next?'"
***
## Phase 2: UI Entry Point (3-4 days)
### 2.1 "Ask AI" Button (Preferred)
**Task**: Add button to blog, social post, and idea detail pages
**Placement**:
* Blog detail (`/blogs/[id]`): In header area, near status
* Social post detail (`/social-posts/[id]`): In header area, near status
* Idea card: Quick action button
**Behavior**:
1. User clicks "Ask AI"
2. Modal opens with quick-action buttons:
    * "What do I do next?"
    * "Why can't I proceed?"
    * "Free text question"
3. AI response displays in modal
4. Close button, no persistence needed
**Component structure**:
```warp-runnable-command
src/components/
├─ ai-assistant-button.tsx (button + trigger)
├─ ai-assistant-modal.tsx (modal container)
├─ ai-response-display.tsx (render structured response)
└─ ai-quick-prompts.tsx (preset question buttons)
```
### 2.2 Loading & Error States
**Task**: Handle async response from `/api/ai/assistant`
**States**:
* Loading (spinner, ~1-2s)
* Success (show response, dismiss button)
* Error (fallback message + retry button)
**No WebSocket needed** (single request/response, fast enough)
### 2.3 Preset Questions
**Task**: Pre-populate common questions based on page context
**Blog page shows**:
* "What do I do next?"
* "Why can't I move to review?"
* "What fields are required?"
**Social post page shows**:
* "What do I do next?"
* "Why can't I publish?"
* "What's a caption?"
**Idea page shows**:
* "Should this be a blog or social?"
* "What happens next?"
***
## Phase 3: Support Blogs (2-3 days)
### 3.1 Workflow Rules Engine
**Task**: Codify workflow rules so AI can reason about them
**Create** `src/lib/workflow-rules.ts`:
```typescript
interface WorkflowStage {
  status: string;
  requiredFields: string[];
  requiredRole: "writer" | "publisher" | "editor" | "admin" | "any";
  nextStages: string[];
}
export const BLOG_WORKFLOW: Record<string, WorkflowStage> = {
  draft: {
    requiredFields: ["title", "writer_id"],
    requiredRole: "writer",
    nextStages: ["writer_review"]
  },
  writer_review: {
    requiredFields: ["title", "content_url", "writer_id"],
    requiredRole: "editor",
    nextStages: ["publisher_review"]
  },
  // ...
};
```
**Use in prompt**:
```warp-runnable-command
Current blog status: draft
Required to proceed to writer_review:
- Title (missing)
- Content URL (present)
- Writer assigned (present)
Next stage: writer_review (can proceed once title added)
```
### 3.2 Social Post Workflow Rules
**Task**: Same as blogs, but for social posts
**Key stages**:
* draft → in_review (requires: product, type, canva_url)
* in_review → creative_approved (requires: platforms, caption, scheduled_date)
* ready_to_publish → awaiting_live_link → published
### 3.3 Idea Workflow Rules
**Task**: Simple rules for ideas (intake only)
**Questions AI should answer**:
* "What type should this be?" → Explain blog vs social vs rejected
* "Why can't I convert this?" → Check if required fields exist
***
## Phase 4: Edge Cases & Polish (2-3 days)
### 4.1 Permission-Aware Guidance
**Task**: AI understands what user CAN and CANNOT do
**Example scenarios**:
1. Writer asks "Why can't I publish this?"
    * AI: "Only publishers can publish. You're a writer. Contact your publisher."
2. Publisher asks "Why can't I edit the content?"
    * AI: "This blog is assigned to Writer A. Reassign ownership to edit."
3. Admin asks "How do I move this to review?"
    * AI: "You can force-transition, but best practice is assign to reviewer."
### 4.2 Concurrent Edit Warnings
**Task**: AI warns if someone else is editing the same item
**Scenario**:
* User A opens blog detail
* User B starts editing
* User A clicks "Ask AI"
* AI: "This blog is being edited by User B. Check updates before proceeding."
**Implementation**: Query `blog_assignment_history` for recent edits
### 4.3 Graceful Degradation
**Task**: If Gemini fails, provide deterministic fallback responses
**Example**:
```typescript
function getFallbackResponse(context: ContextData): AssistantResponse {
  const { pageType, status, blockers, requiredFields } = context;
  const currentState = `You're on a ${pageType} in ${status} status.`;
  const blockersText = blockers.length
    ? [`Missing: ${blockers.join(", ")}`]
    : ["No blockers detected."];
  const nextStepsText = getNextStepsForStatus(pageType, status);
  return {
    currentState,
    blockers: blockersText,
    nextSteps: nextStepsText,
    confidence: 50 // low confidence for fallback
  };
}
```
***
## Data Flow
```warp-runnable-command
User clicks "Ask AI" on blog detail
         ↓
    Modal opens with preset questions
         ↓
    User picks "What do I do next?"
         ↓
POST /api/ai/assistant
  {
    userId: "abc123",
    pageType: "blog",
    entityId: "blog-456",
    userQuestion: "What do I do next?"
  }
         ↓
    Backend context extractor
    - Validate user access (RLS)
    - Fetch blog (status, fields, assignments)
    - Detect blockers (missing fields, permissions)
    - Build structured context
         ↓
    Prompt builder formats prompt
    "Blog is in draft status...
     Required to proceed: Title, Content URL...
     Blockers: Title is missing...
     Question: What do I do next?"
         ↓
    Call Gemini API
         ↓
    Validate response against schema (Zod)
         ↓
    Return to frontend
  {
    currentState: "Blog is in draft status, waiting for title.",
    blockers: ["Title is missing"],
    nextSteps: [
      "Add a title to your blog",
      "Click Submit for Review",
      "Wait for editor to review"
    ],
    confidence: 95
  }
         ↓
    Display in modal
    User reads, understands, closes modal
```
***
## Implementation Order
### Week 1
**Day 1-2**: Backend context extractor + blocker detector
* `context-extractor.ts` (read blog/social/idea from DB)
* `blocker-detector.ts` (check missing fields, permissions)
* `workflow-rules.ts` (codify what "next" means)
* Tests for context extraction
**Day 3**: Gemini integration
* `gemini-client.ts` (API wrapper)
* `prompt-builder.ts` (structured prompts)
* Error handling + fallback responses
**Day 4-5**: API route + validation
* `POST /api/ai/assistant`
* Zod schema validation
* RLS permission check
* Unit tests
**Day 6-7**: UI entry point
* `ai-assistant-button.tsx`
* `ai-assistant-modal.tsx`
* `ai-response-display.tsx`
* Integration tests
***
## Constraints & Non-Scope
**WILL NOT build in MVP**:
* Content generation (captions, blog intros, titles)
* Workflow automation (auto-transitions, auto-assignments)
* Cost tracking or usage dashboards
* Async job queue or background processing
* Fine-tuning or prompt optimization
* Bulk operations
* Passive hints or suggestions
* Integration with Slack or email
**All responses are advisory only**:
* AI never modifies database
* AI never triggers transitions
* AI never assigns users
* User always decides what action to take
***
## Testing Strategy
**Unit tests** (context extraction, blocker detection):
* Mock blog/social/idea records
* Verify correct blocker detection
* Verify fallback responses
**Integration tests** (API endpoint):
* POST request with valid context
* Verify response schema
* Verify permission checks (RLS)
* Verify Gemini API call (mock)
**Manual testing** (UI):
* Click "Ask AI" on different pages
* Test preset questions
* Verify modal displays response correctly
* Test error states
***
## Success Metrics
1. **Latency**: Response in <2 seconds (90th percentile)
2. **Accuracy**: AI response matches actual workflow rules (100%)
3. **Usability**: Users can get guidance without reading docs
4. **Safety**: Zero unintended state changes (100% read-only)
***
## Future Enhancements (Out of Scope)
* Inline helpful hints ("Next: Assign a writer")
* Chat-style follow-up questions
* Workflow diagram visualization
* Video tutorials linked from responses
* Multi-language support
* Analytics on common blockers
