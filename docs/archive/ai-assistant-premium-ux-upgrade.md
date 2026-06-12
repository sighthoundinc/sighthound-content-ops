# Global Floating AI Assistant
**Upgrade**: Transform modal-based "Ask AI" into a persistent, context-aware floating assistant.
**Goal**: Premium, always-accessible workflow guidance across the entire app.
**Current runtime note**: Ask AI uses Gemini-primary prompt interpretation with deterministic fallback; deterministic blocker/gate logic remains authoritative.
# Current State
* ✅ Gemini-primary backend working: `/api/ai/assistant` returns blockers, next steps, quality issues with deterministic fallback
* ✅ Modal component exists: `src/components/ai-assistant-modal.tsx`
* ✅ Blog detail page integrated with button + modal
* ✅ Social post modal component ready but not integrated
* ⚠️ Modal is page-specific and requires manual button clicks
# Vision
Replace modal with a **global floating assistant** that:
1. Lives in bottom-right corner (always visible, never scrolls away)
2. Auto-detects current page context (dashboard, blog, social, etc.)
3. Opens as a side panel (chat-style) with smooth animation
4. Shows deterministic guidance with conversational UX
5. Available everywhere without configuration
6. Resets on page change (no conversation history)
# Scope (Phase 1)
## 1. Floating Button Component
**File**: `src/components/ai/ai-floating-button.tsx`
* Fixed position: bottom-right (z-50, safe distance from viewport edges)
* Smooth hover animation (lift effect, color change)
* Click opens side panel
* Pulse/attention indicator when relevant (optional)
* Accessible: keyboard support, ARIA labels
## 2. Chat-Style Side Panel
**File**: `src/components/ai/ai-chat-panel.tsx`
* Slide-in animation from right (smooth, ~300ms)
* Header: "Ask AI" + close button
* Message body (scrollable):
    * AI responses as chat bubbles
    * Structured blocks: Current State, Blockers, Next Steps, Quality Issues
    * Color-coded severity (critical=red, warning=amber, info=blue)
* Footer: Quick prompts + optional text input
* Click outside or ESC closes panel
* Panel width: 400px (responsive on mobile: 100vw - 20px)
## 3. Message Components
**Files**:
* `src/components/ai/ai-message.tsx` — Individual chat message bubble
* `src/components/ai/ai-blocker-card.tsx` — Formatted blocker block
* `src/components/ai/ai-quality-card.tsx` — Quality issue card
* `src/components/ai/ai-next-steps-card.tsx` — Structured next steps
**Features**:
* Markdown-friendly text rendering
* Icons for severity (error, warning, info)
* Color-coded backgrounds matching severity
* Copy button for next steps (optional)
## 4. Quick Prompts
**File**: `src/components/ai/ai-quick-prompts.tsx`
* Default prompts (context-aware):
    * "What should I do next?"
    * "Why can't I proceed?"
    * "What's wrong with this?"
* Appear as clickable buttons in footer
* Optional: Free text input for custom questions
## 5. Context Detection Hook
**File**: `src/hooks/use-ai-context.ts`
* Auto-detect current page using `usePathname()` and `useParams()`
* Extract:
    * `entityType` (blog, social_post, idea, dashboard, tasks, etc.)
    * `entityId` (if detail page)
    * `userId` (from auth context)
    * `userRole` (admin, writer, publisher, editor)
* Return structured context object
* No manual props needed
## 6. Floating Assistant Provider
**File**: `src/providers/ai-assistant-provider.tsx`
* Global state for:
    * `isOpen` (panel open/closed)
    * `isLoading` (API call in progress)
    * `response` (current AI response)
    * `error` (if any)
* Methods:
    * `togglePanel()`
    * `askAI(prompt)` — calls `/api/ai/assistant` with context
    * `closePanel()`
    * `reset()` — clear response on page change
* Hook: `useAIAssistant()` for component access
## 7. Integration into Layout
**File**: `src/app/layout.tsx`
* Wrap with `AIAssistantProvider`
* Add floating button to bottom-right (persistent across all pages)
* Render chat panel (only visible when isOpen=true)
* Floating button + panel sit above all other content (z-50+)
## 8. Page-Specific Behavior
### Dashboard
* Analyze overall workload (no single entity)
* Show:
    * Items stuck in each stage
    * Missing assignments
    * Quality issues across all content
* Example: "3 blogs stuck in draft, 2 social posts missing captions"
### Blog Detail
* Context: blog ID, blog status, user role
* Show blockers for current stage
* Next steps to move forward
### Social Post Detail
* Context: social post ID, status, user role
* Show blockers for current stage
* Quality issues (caption length, platform selection)
### Ideas
* Context: idea ID
* Guidance on what type (blog/social) and next steps
### Tasks / Open Work
* Analyze assigned tasks
* Show what's blocking progress
* Suggest priorities
## 9. Interaction Model
* **No conversation history**: Each question starts fresh
* **No persistence**: Close panel = clear response
* **No memory across pages**: Page change = reset
* **Single request/response**: No follow-ups or streaming
* **Fast**: <2 seconds to response (deterministic backend)
## 10. Fallback Behavior
* If API fails: Show error + retry button
* If user not authenticated: Hide button
* If no entity context (e.g., settings page): Show generic "What do you need?"
# Implementation Order
## Phase 1a: Core Components (2-3 days)
1. `ai-floating-button.tsx` — Fixed button with hover state
2. `ai-chat-panel.tsx` — Slide-in panel with close
3. `ai-message.tsx` — Message bubble component
4. `ai-blocker-card.tsx`, `ai-quality-card.tsx`, `ai-next-steps-card.tsx` — Content blocks
5. `ai-quick-prompts.tsx` — Quick action buttons
## Phase 1b: Context & State (1-2 days)
6. `use-ai-context.ts` — Auto-detect page + entity
7. `ai-assistant-provider.tsx` — Global state management
8. Integration test (confirm context extraction works)
## Phase 1c: Layout Integration (1 day)
9. Update `src/app/layout.tsx` — Add provider + button + panel
10. Test floating button visible on all pages
11. Test panel opens/closes smoothly
## Phase 1d: Polish & Testing (1-2 days)
12. Keyboard support (ESC to close, Tab navigation)
13. Mobile responsiveness (full-width panel on small screens)
14. Error handling + fallback messages
15. Remove old modal + "Ask AI" buttons from individual pages
16. E2E test on all primary pages
# File Structure
```warp-runnable-command
src/
├─ components/ai/
│  ├─ ai-floating-button.tsx        (persistent button)
│  ├─ ai-chat-panel.tsx             (side panel + messages)
│  ├─ ai-message.tsx                (single message bubble)
│  ├─ ai-blocker-card.tsx           (blocker display)
│  ├─ ai-quality-card.tsx           (quality issue display)
│  ├─ ai-next-steps-card.tsx        (next steps display)
│  └─ ai-quick-prompts.tsx          (quick action buttons)
├─ hooks/
│  └─ use-ai-context.ts             (auto-detect context)
├─ providers/
│  └─ ai-assistant-provider.tsx     (global state)
└─ app/
   └─ layout.tsx                     (integration point)
```
# Success Criteria
1. ✅ Floating button visible on all pages (dashboard, blogs, social, ideas, tasks, etc.)
2. ✅ Button click opens side panel with smooth animation
3. ✅ Panel auto-detects current page + entity
4. ✅ Quick prompts work (send to API, display response)
5. ✅ Response renders as structured blocks (state, blockers, next steps, quality)
6. ✅ Color-coded severity (red/amber/blue)
7. ✅ ESC and close button close panel
8. ✅ Panel resets on page change
9. ✅ Mobile responsive (<500px width)
10. ✅ Keyboard accessible (Tab, Enter, Escape)
11. ✅ No errors on dashboard (no single entity)
12. ✅ Old modal removed from all pages
# Constraints
* No conversation history or memory
* No persistent state across sessions
* No streaming or async updates
* Backend workflow authority remains deterministic; Gemini prompt interpretation is primary with deterministic fallback
* Must work on all primary workspace pages
# Future Enhancements (Out of Scope)
* Typing indicators
* Inline suggestions on pages
* Analytics on assistant usage
* Custom prompt templates
* Integration with notifications
* Voice input/output
