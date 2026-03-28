# Codebase Audit Report

## Overview
Audit of 4 key code patterns across the sighthound-content-ops codebase, conducted on 2026-03-28.

---

## 1. DELETE Permission Enforcement (requirePermission)

### Summary
✅ **Good**: DELETE routes properly use `requirePermission()` for authorization checks.

### Findings
**Pattern Location**: `src/app/api/*/delete` routes
- `ideas/[id]/delete/route.ts` (line 11)
- `blogs/[id]/delete/route.ts` (line 11)  
- `social-posts/[id]/route.ts` (line 11)

**Usage Pattern**:
```typescript
const auth = await requirePermission(request, "delete_*");
if ("error" in auth) {
  return NextResponse.json({ error: auth.error }, { status: auth.status });
}
```

### Observations
1. ✅ Authorization check happens first, before any data access
2. ✅ Permission checks are uniform across all delete endpoints
3. ✅ Error response pattern is consistent (status code + error message)
4. ✅ Defense-in-depth: Additional role checks performed after permission check
5. ✅ Idempotent deletions: Already-deleted resources return 200 instead of 404

### Recommendations
- Status quo is good; no changes needed

---

## 2. Error Message Handling (error.message leaks)

### Summary
⚠️ **Caution**: Some raw error messages leak into user-facing responses. Mostly well-handled, but a few concerning instances.

### Findings by Category

#### A. Safe Error Handling (GOOD)
**Locations**: Most API routes
- Errors are wrapped with human-readable messages
- Example from `blogs/[id]/delete/route.ts` (line 27):
  ```typescript
  return NextResponse.json({ error: "Failed to load blog. Please try again." }, { status: 500 });
  ```

#### B. Intermediate-Safe (CAUTION)
**Location**: `src/app/api/events/record-activity/route.ts` (line 102)
- Raw Supabase error codes checked (`code === "42P01"`) but logged as `error.message`
- Impact: Low, error is logged (not user-facing) and gracefully degrades

#### C. Potentially Exposed (AUDIT)
**Locations with `error.message` in user context**:
1. `src/app/social-posts/page.tsx` (lines 1387, 1397, 1411, 1441)
   - Links save errors: `${upsertError.message}`, `${linksError.message}`
   - Comments save errors: `${insertError.message}`
   - These may expose Supabase error details to UI

2. `src/app/ideas/page.tsx` (line 270)
   - Update error: Logged but not exposed to user (handled safely)

3. `src/app/api/blogs/import/route.ts` (line 270)
   - Import error: Part of validation response (may expose details)

### Error Message Leaks in UI

**File**: `src/app/social-posts/page.tsx`

```typescript
// Line 1387 (link save)
throw new Error(upsertError.message);  // Later wrapped: `Couldn't save links. ${saveError.message}`

// Line 1441 (comment save)
setPanelError(`Couldn't add comment. ${insertError.message}`);  // Direct leak
```

**Impact**: Users may see internal Supabase error details like:
- "violates unique constraint"
- "column does not exist"
- "permission denied"

### Recommendations
1. **Wrap error messages**: Create standardized error messages in `src/lib/error-messages.ts`
2. **Audit import validation**: Review `src/app/api/blogs/import/route.ts` for error exposure
3. **Test with Supabase**: Verify what error messages Supabase returns and create fallback mappings

---

## 3. Browser Confirm Dialogs (window.confirm)

### Summary
⚠️ **Consistency Issue**: Using native `window.confirm()` instead of custom dialog component. Not inherently wrong, but inconsistent with potential modal system.

### Locations
Found in 3 places:

1. **`src/app/social-posts/page.tsx`**
   - Line 1477: Bulk delete confirmation
     ```typescript
     const confirmed = window.confirm(
       `Are you sure you want to delete ${postCount} post${postCount === 1 ? "" : "s"}?...`
     );
     ```
   - Line 1543: Single delete confirmation
     ```typescript
     const confirmed = window.confirm(
       `Are you sure you want to delete "${post.title}"?...`
     );
     ```

2. **`src/app/ideas/page.tsx`**
   - Line 299: Delete confirmation
     ```typescript
     const confirmed = window.confirm(
       `Are you sure you want to delete "${idea.title}"?...`
     );
     ```

3. **`src/app/social-posts/[id]/page.tsx`**
   - Line 1279: Delete confirmation
     ```typescript
     const confirmed = window.confirm(
       `Are you sure you want to delete "${post.title}"?...`
     );
     ```
   - Line 1199: Reopen brief (uses `window.prompt` for optional input)
     ```typescript
     const reasonInput = window.prompt(
       "Optional reason for reopening this post to Creative Approved:"
     );
     ```

### Observations
1. ✅ All confirmations are for destructive actions (deletes, reopens)
2. ✅ Messages are clear and include context (count, title)
3. ⚠️ `window.confirm` is browser-native, not themed/branded
4. ⚠️ No custom dialog component is being used
5. ⚠️ Inconsistent with potential design system expectations

### Recommendations
1. **Check design system**: Verify if a custom `ConfirmDialog` component exists
2. **Standardize if needed**: Consider creating a reusable `useConfirmDialog` hook
3. **Keep as-is if acceptable**: Native dialogs work fine for critical actions

---

## 4. API Response Pattern (success: true)

### Summary
✅ **Good Pattern**: Responses use explicit status codes and structured payloads. No reliance on `success:` field.

### Findings

#### A. API Response Structure (GOOD)
**Common pattern across all API routes**:
```typescript
// Success response
return NextResponse.json({ data: {...}, message: "..." }, { status: 200 });

// Error response
return NextResponse.json({ error: "..." }, { status: 400|403|500 });
```

#### B. Locations with `success:` field
Found in **non-API** contexts:

1. `src/hooks/use-social-post-transition.ts` (lines 36, 167)
   - Response shape: `{ success: boolean, ... }`
   - Used internally for transition results

2. `src/lib/emit-event.ts` (lines 30, 38, 43, 46, 95, 100)
   - Event emission responses include `success` field
   - Pattern: `{ success: true, data: {...} }` or `{ success: false, error: ... }`

3. `src/app/api/admin/users/[userId]/password/route.ts` (line 68)
   - Response: `{ success: true, message: "..." }` for password reset
   - **Issue**: Should use status codes instead

4. `src/providers/alerts-provider.tsx` (line 63)
   - Internal state management, not API response

#### C. Locations with mixed patterns
**`src/lib/api-contract.ts`**:
- Documents API response contracts with both `success` fields and status codes
- Mixed usage: `{ success: true, data: {...} }` alongside HTTP status codes

### Recommendations
1. ✅ **Status quo for main API**: Current pattern with status codes is good
2. ⚠️ **Standardize password reset**: Update `admin/users/[userId]/password/route.ts` to return `{ data: {...}, message: "..." }` instead of `{ success: true }`
3. ✅ **Keep internal hooks as-is**: `use-social-post-transition.ts` response shape is fine (internal only)
4. ✅ **Keep emit-event as-is**: Event helper layer can use `success` field (not exposed to clients)

---

## Audit Summary Table

| Pattern | Status | Action |
|---------|--------|--------|
| **DELETE permissions** | ✅ Good | None |
| **Error message exposure** | ⚠️ Caution | Review UI error handling in social-posts/page.tsx |
| **Browser dialogs** | ⚠️ Minor | Verify design system expectations |
| **API response shape** | ✅ Good | Standardize password reset endpoint |

---

## Priority Actions

### High Priority
1. Audit `src/app/social-posts/page.tsx` error message exposures (lines 1387, 1397, 1411, 1441)
   - Wrap Supabase errors with safe fallback messages
   - Example: `Couldn't save links. Please check your input and try again.`

### Medium Priority
1. Check if design system specifies custom dialog component
2. Decide on confirmation dialog standardization (if needed)

### Low Priority
1. Standardize password reset response format for consistency
2. Update `api-contract.ts` documentation if response patterns change

---

## Appendix: Audit Commands Used

```bash
# 1. DELETE permissions
grep -R "requirePermission" src/app/api

# 2. Raw error leaks
grep -R "error\.message" src

# 3. Old confirm dialogs
grep -R "window\.confirm" src

# 4. API response pattern
grep -R "success:" src/app/api
```
